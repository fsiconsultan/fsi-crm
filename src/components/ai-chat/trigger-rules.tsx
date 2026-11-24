"use client"

import { useState, useTransition } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { deleteRule, saveRule, setRuleEnabled, type FormResult } from "@/app/(app)/ai-chat/actions"
import { dangerButtonClass } from "@/components/customers/delete-customer-dialog"
import { StatusChip } from "@/components/leads/status-chip"
import { Card, CardHeader } from "@/components/ui/card"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { pillClass } from "@/components/ui/pill"
import { PillSelect } from "@/components/ui/pill-select"
import { EmptyState } from "@/components/ui/states"
import { targetStatusOptions, type TriggerRule } from "@/lib/ai-chat/settings"
import { ResultLine, checkboxClass, textareaClass, useSettingsForm } from "./form-bits"

const iconButtonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 md:size-9"

type Editing = { rule: TriggerRule | null } | null

export function TriggerRulesCard({ rules }: { rules: TriggerRule[] }) {
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<TriggerRule | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null)
  const onCount = rules.filter((rule) => rule.enabled).length

  const openEditor = (rule: TriggerRule | null) => {
    setNotice(null)
    setEditing({ rule })
  }

  return (
    <Card as="section">
      <CardHeader
        id="rules-title"
        title="Pipeline triggers"
        meta={`${rules.length} ${rules.length === 1 ? "rule" : "rules"}, ${onCount} on. The AI suggests the stage; a salesperson confirms it.`}
        action={
          <button type="button" onClick={() => openEditor(null)} className={pillClass("tinted")}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Add rule
          </button>
        }
      />

      {notice ? (
        <p
          role={notice.ok ? "status" : "alert"}
          className={
            notice.ok
              ? "mb-3 text-[13px] text-positive"
              : "mb-3 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink"
          }
        >
          {notice.message}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <EmptyState
          title="No triggers yet"
          detail="Add a rule for something a customer says in chat, such as asking for a price, and the stage the AI should suggest."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line" aria-labelledby="rules-title">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onEdit={() => openEditor(rule)}
              onDelete={() => {
                setNotice(null)
                setDeleting(rule)
              }}
              onNotice={setNotice}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <RuleDialog
          rule={editing.rule}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            setNotice({ ok: true, message })
          }}
        />
      ) : null}

      <DeleteRuleDialog
        rule={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(message) => {
          setDeleting(null)
          setNotice({ ok: true, message })
        }}
      />
    </Card>
  )
}

function RuleRow({
  rule,
  onEdit,
  onDelete,
  onNotice,
}: {
  rule: TriggerRule
  onEdit: () => void
  onDelete: () => void
  onNotice: (notice: { ok: boolean; message: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  const switchId = `rule-on-${rule.id}`

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[13px] font-medium ${rule.enabled ? "text-ink" : "text-muted"}`}>{rule.name}</p>
          <StatusChip status={rule.target_status} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{rule.trigger_description}</p>
      </div>
      <div className="flex items-center gap-1">
        <label htmlFor={switchId} className="flex min-h-11 items-center gap-2 pr-2 text-[13px] md:min-h-9">
          <input
            id={switchId}
            type="checkbox"
            checked={rule.enabled}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.checked
              startTransition(async () => {
                const result = await setRuleEnabled(rule.id, next)
                if (!result.ok) onNotice(result)
              })
            }}
            className={checkboxClass}
          />
          On
        </label>
        <button type="button" onClick={onEdit} className={iconButtonClass} aria-label={`Edit rule ${rule.name}`}>
          <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onDelete} className={iconButtonClass} aria-label={`Delete rule ${rule.name}`}>
          <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}

function RuleDialog({
  rule,
  onClose,
  onSaved,
}: {
  rule: TriggerRule | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [dirty, setDirty] = useState(false)
  const { state, pending, onSubmit, errors } = useSettingsForm(saveRule, (next: FormResult) => onSaved(next.message))
  const id = (name: string) => `rule-${name}`

  return (
    <Dialog
      open
      onClose={onClose}
      busy={pending}
      dismissOnBackdrop={!dirty}
      title={rule ? "Edit trigger" : "Add trigger"}
      description="The AI watches for this in the chat and suggests moving the lead to the stage you choose."
    >
      <form onSubmit={onSubmit} onInput={() => setDirty(true)} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={rule?.id ?? ""} />
        <Field label="Name" htmlFor={id("name")} error={errors.name}>
          <input
            id={id("name")}
            name="name"
            defaultValue={rule?.name ?? ""}
            data-autofocus
            placeholder="For example: Asks for a price"
            className={inputClass}
            {...fieldAria(id("name"), errors.name)}
          />
        </Field>
        <Field
          label="When the customer"
          htmlFor={id("trigger")}
          error={errors.trigger_description}
          hint="Describe what they say or do. This becomes an instruction to the AI."
        >
          <textarea
            id={id("trigger")}
            name="trigger_description"
            defaultValue={rule?.trigger_description ?? ""}
            rows={3}
            className={textareaClass}
            {...fieldAria(id("trigger"), errors.trigger_description, true)}
          />
        </Field>
        <PillSelect
          name="target_status"
          label="Suggest this stage"
          defaultValue={rule?.target_status ?? "Quotation"}
          options={targetStatusOptions()}
          error={errors.target_status}
          onChange={() => setDirty(true)}
        />
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={rule?.enabled ?? true} className={checkboxClass} />
          <span>Rule is on</span>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm text-muted">
          <input type="checkbox" checked={false} disabled readOnly className={checkboxClass} aria-describedby={id("auto-why")} />
          <span>
            Move the lead without asking
            <span id={id("auto-why")} className="block text-[13px]">
              Not available in this version: the AI only suggests, and a salesperson confirms the move.
            </span>
          </span>
        </label>
        <ResultLine state={state.result === "error" ? state : { ...state, result: "idle" }} />
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className={pillClass("tinted", "justify-center")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={pillClass("on", "justify-center")}>
            {pending ? "Saving…" : rule ? "Save rule" : "Add rule"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function DeleteRuleDialog({
  rule,
  onClose,
  onDeleted,
}: {
  rule: TriggerRule | null
  onClose: () => void
  onDeleted: (message: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog
      open={rule !== null}
      onClose={() => {
        setError(null)
        onClose()
      }}
      busy={pending}
      title="Delete this trigger?"
      description={rule ? `"${rule.name}" is removed for everyone. This cannot be undone.` : undefined}
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <button type="button" onClick={onClose} disabled={pending} className={pillClass("tinted", "justify-center")}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          className={dangerButtonClass}
          onClick={() => {
            if (!rule) return
            startTransition(async () => {
              const result = await deleteRule(rule.id)
              if (result.ok) {
                setError(null)
                onDeleted(`Rule "${rule.name}" deleted.`)
              } else setError(result.message)
            })
          }}
        >
          {pending ? "Deleting…" : "Delete rule"}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
