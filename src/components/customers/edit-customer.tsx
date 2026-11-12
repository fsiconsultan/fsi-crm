"use client"

import { useActionState, useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { updateCustomer, type CustomerField, type CustomerFormState } from "@/app/(app)/customers/[id]/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import type { Tables } from "@/lib/supabase/database.types"
import { LEAD_STATUSES, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

type SalesOption = { id: string; name: string | null; username: string | null; status: string | null }

const INITIAL: CustomerFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }

const DATES = [
  { name: "appointment", label: "Appointment" },
  { name: "site_survey", label: "Site survey" },
  { name: "quotation", label: "Quotation" },
  { name: "closing", label: "Closing" },
  { name: "follow_up_date", label: "Follow-up" },
] as const

export function EditCustomer({
  customer,
  salesOptions,
}: {
  customer: Tables<"leads">
  // Present only for an Admin, who may reassign the customer.
  salesOptions: SalesOption[] | null
}) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  return (
    <>
      {saved ? (
        <p role="status" className="text-sm text-positive">
          {saved}
        </p>
      ) : null}
      <Button
        onClick={() => {
          setSaved(null)
          setOpen(true)
        }}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Edit
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit customer"
        description="Only the fields you change are saved."
      >
        <EditForm
          customer={customer}
          salesOptions={salesOptions}
          onCancel={() => setOpen(false)}
          onSaved={(message) => {
            setSaved(message)
            setOpen(false)
          }}
        />
      </Dialog>
    </>
  )
}

function EditForm({
  customer,
  salesOptions,
  onCancel,
  onSaved,
}: {
  customer: Tables<"leads">
  salesOptions: SalesOption[] | null
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const [state, action, pending] = useActionState(updateCustomer.bind(null, customer.id), INITIAL)

  useEffect(() => {
    if (state.result === "saved") onSaved(state.message)
  }, [state, onSaved])

  // After a failed save the form shows what was typed, not the stored row.
  const value = (name: CustomerField) => state.values[name] ?? customer[name] ?? ""
  const error = (name: CustomerField) => state.fieldErrors[name]

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="customer_name" error={error("customer_name")} className="sm:col-span-2">
          <input
            id="customer_name"
          data-autofocus
            name="customer_name"
            autoComplete="off"
            autoCapitalize="words"
            defaultValue={value("customer_name")}
            className={inputClass}
            {...fieldAria("customer_name", error("customer_name"))}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={error("phone")}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            defaultValue={value("phone")}
            className={inputClass}
            {...fieldAria("phone", error("phone"))}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={error("email")}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={value("email")}
            className={inputClass}
            {...fieldAria("email", error("email"))}
          />
        </Field>
        <Field label="Business" htmlFor="business" error={error("business")}>
          <input
            id="business"
            name="business"
            defaultValue={value("business")}
            className={inputClass}
            {...fieldAria("business", error("business"))}
          />
        </Field>
        <Field label="Location" htmlFor="location" error={error("location")}>
          <input
            id="location"
            name="location"
            defaultValue={value("location")}
            className={inputClass}
            {...fieldAria("location", error("location"))}
          />
        </Field>
        <Field label="Type" htmlFor="lead_type" error={error("lead_type")}>
          <select
            id="lead_type"
            name="lead_type"
            defaultValue={value("lead_type")}
            className={inputClass}
            {...fieldAria("lead_type", error("lead_type"))}
          >
            {customer.lead_type === null ? <option value="">Not set</option> : null}
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Status"
          htmlFor="status"
          error={error("status")}
          hint="Changing the status restarts its start date."
        >
          <select
            id="status"
            name="status"
            defaultValue={value("status")}
            className={inputClass}
            {...fieldAria("status", error("status"), "hint")}
          >
            {customer.status === null ? <option value="">{NO_STATUS_LABEL}</option> : null}
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        {salesOptions ? (
          <Field label="Salesperson" htmlFor="sales_id" error={error("sales_id")} className="sm:col-span-2">
            <select
              id="sales_id"
              name="sales_id"
              defaultValue={value("sales_id")}
              className={inputClass}
              {...fieldAria("sales_id", error("sales_id"))}
            >
              <option value="">Unassigned</option>
              {salesOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name ?? option.username ?? "Unnamed user"}
                  {option.status === "Inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <legend className="sr-only">Pipeline dates</legend>
        {DATES.map((date) => (
          <Field key={date.name} label={date.label} htmlFor={date.name} error={error(date.name)}>
            <input
              id={date.name}
              name={date.name}
              type="date"
              defaultValue={value(date.name)}
              className={inputClass}
              {...fieldAria(date.name, error(date.name))}
            />
          </Field>
        ))}
      </fieldset>

      <Field label="Notes" htmlFor="notes" error={error("notes")}>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={value("notes")}
          className={`${inputClass} py-2.5`}
          {...fieldAria("notes", error("notes"))}
        />
      </Field>

      {state.result === "error" ? (
        <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
          {state.message}
        </p>
      ) : null}
      {state.result === "unchanged" ? (
        <p role="status" className="text-sm text-muted">
          {state.message}
        </p>
      ) : null}

      <DialogFooter>
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
