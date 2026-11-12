"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Pencil } from "lucide-react"
import { updateCustomer, type CustomerField, type CustomerFormState } from "@/app/(app)/customers/[id]/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import type { Tables } from "@/lib/supabase/database.types"
import { LEAD_STATUSES, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

type SalesOption = { id: string; name: string | null; username: string | null; status: string | null }

// null: the viewer is not an Admin and cannot reassign. ok false: the list
// could not be loaded, so the field is left out rather than shown empty.
export type SalesChoices = { ok: true; options: SalesOption[] } | { ok: false } | null

const INITIAL: CustomerFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }

const DATES = [
  { name: "appointment", label: "Appointment" },
  { name: "site_survey", label: "Site survey" },
  { name: "quotation", label: "Quotation" },
  { name: "closing", label: "Closing" },
  { name: "follow_up_date", label: "Follow-up" },
] as const

type Props = {
  customer: Tables<"leads">
  sales: SalesChoices
  // Name of the person currently assigned, when the viewer can see it.
  currentSalesName: string | null
}

export function EditCustomer(props: Props) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  const close = () => {
    setOpen(false)
    setDirty(false)
  }

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
        onClose={close}
        busy={busy}
        dismissOnBackdrop={!dirty}
        title="Edit customer"
        description="Only the fields you change are saved."
      >
        <EditForm
          {...props}
          onCancel={close}
          onBusy={setBusy}
          onDirty={() => setDirty(true)}
          onSaved={(message) => {
            setSaved(message)
            close()
          }}
        />
      </Dialog>
    </>
  )
}

function EditForm({
  customer,
  sales,
  currentSalesName,
  onCancel,
  onBusy,
  onDirty,
  onSaved,
}: Props & {
  onCancel: () => void
  onBusy: (busy: boolean) => void
  onDirty: () => void
  onSaved: (message: string) => void
}) {
  // The row's updated_at travels with the save; the server refuses it if the
  // row has changed since this form was opened.
  const [state, action, pending] = useActionState(
    updateCustomer.bind(null, customer.id, customer.updated_at ?? ""),
    INITIAL,
  )
  // Ids are prefixed so two forms on one page never share an id.
  const uid = useId()
  const id = (name: CustomerField) => `${uid}-${name}`

  useEffect(() => {
    onBusy(pending)
  }, [pending, onBusy])

  useEffect(() => {
    if (state.result === "saved") onSaved(state.message)
  }, [state, onSaved])

  // After a failed save the form shows what was typed, not the stored row.
  const value = (name: CustomerField) => state.values[name] ?? customer[name] ?? ""
  const error = (name: CustomerField) => state.fieldErrors[name]

  const textInput = (name: CustomerField, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={id(name)}
      name={name}
      autoComplete="off"
      defaultValue={value(name)}
      className={inputClass}
      {...fieldAria(id(name), error(name))}
      {...extra}
    />
  )

  // A select is remounted (key) when its value comes back from the server:
  // React does not re-apply a changed defaultValue to a mounted select, so
  // without it the choice would snap back after a failed save.
  const storedType = customer.lead_type ?? ""
  const storedStatus = customer.status ?? ""
  const storedSales = customer.sales_id ?? ""

  return (
    <form action={action} onChange={onDirty} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={id("customer_name")} error={error("customer_name")} className="sm:col-span-2">
          {textInput("customer_name", { autoCapitalize: "words", "data-autofocus": true } as React.InputHTMLAttributes<HTMLInputElement>)}
        </Field>
        <Field label="Phone" htmlFor={id("phone")} error={error("phone")}>
          {textInput("phone", { type: "tel", inputMode: "tel" })}
        </Field>
        <Field label="Email" htmlFor={id("email")} error={error("email")}>
          {textInput("email", { type: "email", inputMode: "email", autoCapitalize: "none", spellCheck: false })}
        </Field>
        <Field label="Business" htmlFor={id("business")} error={error("business")}>
          {textInput("business")}
        </Field>
        <Field label="Location" htmlFor={id("location")} error={error("location")}>
          {textInput("location")}
        </Field>
        <Field label="Type" htmlFor={id("lead_type")} error={error("lead_type")}>
          <select
            key={value("lead_type")}
            id={id("lead_type")}
            name="lead_type"
            defaultValue={value("lead_type")}
            className={inputClass}
            {...fieldAria(id("lead_type"), error("lead_type"))}
          >
            {/* The stored value always has an option, so saving never rewrites it by accident. */}
            {(LEAD_TYPES as readonly string[]).includes(storedType) ? null : (
              <option value={storedType}>{storedType || "Not set"}</option>
            )}
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Status"
          htmlFor={id("status")}
          error={error("status")}
          hint="Changing the status restarts its start date."
        >
          <select
            key={value("status")}
            id={id("status")}
            name="status"
            defaultValue={value("status")}
            className={inputClass}
            {...fieldAria(id("status"), error("status"), true)}
          >
            {(LEAD_STATUSES as readonly string[]).includes(storedStatus) ? null : (
              <option value={storedStatus}>{storedStatus || NO_STATUS_LABEL}</option>
            )}
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        {sales?.ok ? (
          <Field label="Salesperson" htmlFor={id("sales_id")} error={error("sales_id")} className="sm:col-span-2">
            <select
              key={value("sales_id")}
              id={id("sales_id")}
              name="sales_id"
              defaultValue={value("sales_id")}
              className={inputClass}
              {...fieldAria(id("sales_id"), error("sales_id"))}
            >
              <option value="">Unassigned</option>
              {storedSales && !sales.options.some((option) => option.id === storedSales) ? (
                <option value={storedSales}>{currentSalesName ?? "Current salesperson"}</option>
              ) : null}
              {sales.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name ?? option.username ?? "Unnamed user"}
                  {option.status === "Inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : sales ? (
          <p className="text-[13px] text-muted sm:col-span-2">
            The salesperson list could not be loaded, so the assignment cannot be changed right now. It stays as it
            is; reload the page to try again.
          </p>
        ) : null}
      </div>

      <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <legend className="sr-only">Pipeline dates</legend>
        {DATES.map((date) => (
          <Field key={date.name} label={date.label} htmlFor={id(date.name)} error={error(date.name)}>
            {textInput(date.name, { type: "date" })}
          </Field>
        ))}
      </fieldset>

      <Field label="Notes" htmlFor={id("notes")} error={error("notes")}>
        <textarea
          id={id("notes")}
          name="notes"
          rows={4}
          defaultValue={value("notes")}
          className={`${inputClass} py-2.5`}
          {...fieldAria(id("notes"), error("notes"))}
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
