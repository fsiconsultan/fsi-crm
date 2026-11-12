"use client"

import Link from "next/link"
import { useActionState } from "react"
import { saveLead, type LeadField, type LeadFormState } from "@/app/(app)/leads/actions"
import { Button, buttonClass } from "@/components/ui/button"
import { Field, inputClass } from "@/components/ui/field"
import type { SalesUser } from "@/lib/data/leads"
import { LEAD_STATUSES, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

export function LeadForm({
  leadId,
  initial,
  salesUsers,
  back,
}: {
  leadId: number | null
  initial: Record<LeadField, string>
  /** Only Admin assigns leads; null hides the field and the lead stays with its owner. */
  salesUsers: SalesUser[] | null
  back: string
}) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(saveLead, {
    message: null,
    errors: {},
    values: initial,
  })
  const { values, errors } = state

  // Shared attributes for one field. Selects also get a key on their Field so
  // React applies the value the server echoes back after a failed save.
  const control = (field: LeadField) => ({
    id: field,
    name: field,
    defaultValue: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
    className: inputClass,
  })

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {leadId ? <input type="hidden" name="id" value={leadId} /> : null}
      <input type="hidden" name="back" value={back} />

      {state.message ? (
        <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-4 py-3 text-sm text-ink">
          {state.message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="customer_name" label="Customer name" error={errors.customer_name}>
          <input {...control("customer_name")} required autoComplete="off" />
        </Field>
        <Field id="phone" label="Phone or WhatsApp" error={errors.phone}>
          <input {...control("phone")} required type="tel" inputMode="tel" autoComplete="off" placeholder="0812 0000 0000" />
        </Field>
        <Field id="email" label="Email" hint="Optional" error={errors.email}>
          <input {...control("email")} type="email" autoComplete="off" placeholder="name@example.com" />
        </Field>
        <Field id="business" label="Business" hint="Optional" error={errors.business}>
          <input {...control("business")} autoComplete="off" />
        </Field>
        <Field id="location" label="Location" hint="Optional" error={errors.location} className="md:col-span-2">
          <input {...control("location")} autoComplete="off" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-line pt-6 md:grid-cols-2 xl:grid-cols-3">
        <Field key={`type:${values.lead_type}`} id="lead_type" label="Lead type" error={errors.lead_type}>
          <select {...control("lead_type")}>
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field
          key={`status:${values.status}`}
          id="status"
          label="Status"
          hint={leadId ? "Changing it restarts the days-in-status count." : undefined}
          error={errors.status}
        >
          <select {...control("status")}>
            {leadId && !initial.status ? <option value="">{NO_STATUS_LABEL} (leave as it is)</option> : null}
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        {salesUsers ? (
          <Field key={`sales:${values.sales_id}`} id="sales_id" label="Salesperson" error={errors.sales_id}>
            <select {...control("sales_id")} required>
              <option value="">Choose a salesperson</option>
              {salesUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {user.status === "Inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-line pt-6 xl:grid-cols-4">
        <Field id="follow_up_date" label="Follow-up date" error={errors.follow_up_date}>
          <input {...control("follow_up_date")} type="date" />
        </Field>
        <Field id="appointment" label="Appointment" error={errors.appointment}>
          <input {...control("appointment")} type="date" />
        </Field>
        <Field id="site_survey" label="Site survey" error={errors.site_survey}>
          <input {...control("site_survey")} type="date" />
        </Field>
        <Field id="quotation" label="Quotation" error={errors.quotation}>
          <input {...control("quotation")} type="date" />
        </Field>
        <Field id="notes" label="Notes" hint="Optional" error={errors.notes} className="col-span-2 xl:col-span-4">
          <textarea {...control("notes")} rows={4} className={`${inputClass} py-2.5`} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : leadId ? "Save changes" : "Add lead"}
        </Button>
        <Link href={back} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
