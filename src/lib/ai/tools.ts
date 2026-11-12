import { matchLeadByPhone } from "@/lib/phone"
import type { Notifier } from "@/lib/push/notify"
import { decideAssignment } from "@/lib/whatsapp/assignment"
import { safeLog, type WaStore } from "@/lib/whatsapp/store"
import type { Conversation } from "@/lib/whatsapp/types"
import type { ToolSpec } from "./model"
import { cleanAnswers, missingAnswers, QUALIFICATION_FIELDS, type QualificationAnswers } from "./qualification"
import { bookSiteVisit, calculateIndicativeSystem } from "./seams"
import { applyStatusEvent, STATUS_FOR_NEW_WHATSAPP_LEAD, STATUS_RULES } from "./status-rules"

// What a tool can reach. `conversation` is replaced when a tool changes it, so
// later tools in the same run see the new state.
export type ToolContext = {
  store: WaStore
  conversation: Conversation
  now: Date
  handoffRequested: boolean
  // Phone notifications; null until VAPID is configured. Never throws.
  notifier?: Notifier | null
}

type Args = Record<string, unknown>

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

export async function findOrCreateLead(ctx: ToolContext, args: Args) {
  const { store, conversation } = ctx
  if (conversation.lead_id) return { status: "linked", lead_id: conversation.lead_id }

  const match = matchLeadByPhone(await store.findLeadsByPhoneWa(conversation.wa_id), conversation.wa_id)

  if (match.kind === "ambiguous") {
    if (!(await store.hasOpenEvent(conversation.id, "lead_match_ambiguous"))) {
      await safeLog(store, {
        type: "lead_match_ambiguous",
        conversationId: conversation.id,
        severity: "warning",
        needsReview: true,
        summary: `${match.leads.length} leads share this WhatsApp number. The conversation is not linked to any of them yet.`,
        detail: { lead_ids: match.leads.map((l) => l.id) },
      })
    }
    return {
      status: "ambiguous",
      note: "Several existing records share this number. No record was created or linked; staff will sort it out. Keep helping the customer.",
    }
  }

  const created = match.kind === "none"
  const lead = created
    ? await store.createLead({
        customerName: text(args.customer_name) ?? conversation.profile_name,
        phone: `+${conversation.wa_id}`,
        status: STATUS_FOR_NEW_WHATSAPP_LEAD,
        statusStartedAt: ctx.now.toISOString(),
        notes: "Created from a WhatsApp conversation.",
      })
    : match.lead

  const assignment = conversation.assigned_sales_id ? null : decideAssignment(lead)
  await store.updateConversation(conversation.id, {
    lead_id: lead.id,
    ...(assignment ? { assigned_sales_id: assignment.salesId } : {}),
  })
  ctx.conversation = {
    ...conversation,
    lead_id: lead.id,
    assigned_sales_id: assignment?.salesId ?? conversation.assigned_sales_id,
  }

  if (assignment) {
    await store.recordAssignment({
      conversationId: conversation.id,
      leadId: lead.id,
      fromSalesId: null,
      toSalesId: assignment.salesId,
      rule: assignment.rule,
      assignedBy: null,
    })
    await ctx.notifier?.assigned(ctx.conversation, assignment.salesId, null)
  }
  await safeLog(store, {
    type: created ? "lead_created" : "lead_linked",
    conversationId: conversation.id,
    leadId: lead.id,
    summary: created
      ? `Lead #${lead.id} created from WhatsApp with status ${STATUS_FOR_NEW_WHATSAPP_LEAD}.`
      : `WhatsApp number matched existing lead #${lead.id}.`,
    // `to` lets the status guard see that the automation set this status.
    detail: created ? { source: "whatsapp", to: STATUS_FOR_NEW_WHATSAPP_LEAD } : { source: "whatsapp" },
  })

  const existing = await store.getQualification(conversation.id)
  if (existing && existing.lead_id !== lead.id) {
    await store.saveQualification(conversation.id, lead.id, cleanAnswers(existing.answers))
  }

  return { status: created ? "created" : "linked", lead_id: lead.id }
}

export async function saveQualificationAnswers(ctx: ToolContext, args: Args) {
  const { store, conversation } = ctx
  const incoming = cleanAnswers(args)
  if (Object.keys(incoming).length === 0) {
    return { status: "error", message: "No recognised answers were passed." }
  }

  const existing = await store.getQualification(conversation.id)
  const merged: QualificationAnswers = { ...cleanAnswers(existing?.answers), ...incoming }
  await store.saveQualification(conversation.id, conversation.lead_id, merged)

  return { status: "saved", still_missing: missingAnswers(merged) }
}

export async function requestHumanHandoff(ctx: ToolContext, args: Args) {
  const { store, conversation } = ctx
  const reason = text(args.reason) ?? "No reason given."

  // Mode goes to human with nobody named yet: the AI stays quiet until a staff
  // member hands the conversation back.
  await store.updateConversation(conversation.id, { mode: "human" })
  ctx.conversation = { ...conversation, mode: "human" }
  ctx.handoffRequested = true

  await safeLog(store, {
    type: "handoff_requested",
    conversationId: conversation.id,
    leadId: conversation.lead_id,
    severity: "warning",
    needsReview: true,
    summary: `The assistant asked for a person to take over: ${reason}`,
    detail: { reason },
  })
  // After the handoff is recorded, so a failed notification cannot undo it.
  // Re-read so an Admin's reassignment during this run picks the right person.
  if (ctx.notifier) {
    const current = await store.getConversation(conversation.id).catch(() => null)
    await ctx.notifier.handoff(current ?? ctx.conversation)
  }
  return { status: "handed_off", note: "Tell the customer a member of the FSI team will reply here, then stop." }
}

export async function setLeadStatus(ctx: ToolContext, args: Args) {
  const { store, conversation } = ctx
  const event = text(args.event) ?? ""

  if (!conversation.lead_id) {
    return { status: "refused", reason: "No lead is linked yet. Call find_or_create_lead first." }
  }
  if (event === "qualification_completed") {
    const existing = await store.getQualification(conversation.id)
    const missing = missingAnswers(cleanAnswers(existing?.answers))
    if (missing.length) return { status: "refused", reason: `Qualification is not complete. Missing: ${missing.join(", ")}.` }
  }

  const result = await applyStatusEvent({
    store,
    leadId: conversation.lead_id,
    event,
    conversationId: conversation.id,
    now: ctx.now,
  })
  return { status: result.outcome, ...("reason" in result ? { reason: result.reason } : {}) }
}

const answerProperties = Object.fromEntries(
  QUALIFICATION_FIELDS.map((f) => [f.key, { type: "string", description: `${f.label}. ${f.hint}` }]),
)

type Tool = ToolSpec & { run: (ctx: ToolContext, args: Args) => Promise<unknown> }

export const TOOLS: Tool[] = [
  {
    name: "find_or_create_lead",
    description:
      "Link this WhatsApp conversation to the customer's lead record, creating one if the phone number is new. Uses the conversation's own number.",
    parameters: {
      type: "object",
      properties: { customer_name: { type: "string", description: "The name the customer gave, if any." } },
      additionalProperties: false,
    },
    run: findOrCreateLead,
  },
  {
    name: "save_qualification_answers",
    description: "Save one or more qualification answers. Pass only the fields you learned or corrected.",
    parameters: { type: "object", properties: answerProperties, additionalProperties: false },
    run: saveQualificationAnswers,
  },
  {
    name: "set_lead_status",
    description:
      "Report a defined event so the lead's status can follow it. The change is refused if a person set the current status.",
    parameters: {
      type: "object",
      properties: { event: { type: "string", enum: Object.keys(STATUS_RULES) } },
      required: ["event"],
      additionalProperties: false,
    },
    run: setLeadStatus,
  },
  {
    name: "request_human_handoff",
    description: "Hand the conversation to FSI staff. The assistant stops replying until staff hand it back.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string", description: "Why a person is needed, in one sentence." } },
      required: ["reason"],
      additionalProperties: false,
    },
    run: requestHumanHandoff,
  },
  {
    name: "calculate_indicative_system",
    description: "Indicative solar system size, saving and price for this customer.",
    parameters: {
      type: "object",
      properties: {
        monthly_pln_bill_idr: { type: "string" },
        monthly_consumption_kwh: { type: "string" },
        electrical_connection: { type: "string" },
        location: { type: "string" },
        property_type: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (_ctx, args) => calculateIndicativeSystem(args),
  },
  {
    name: "book_site_visit",
    description: "Book a site visit with an FSI representative.",
    parameters: {
      type: "object",
      properties: { preferred_time: { type: "string" }, address: { type: "string" } },
      additionalProperties: false,
    },
    run: (_ctx, args) => bookSiteVisit(args),
  },
]
