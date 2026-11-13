"use client"

import { useActionState, useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { updateCustomer, type CustomerField, type CustomerFormState } from "@/app/(app)/customers/[id]/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { PillSelect, type PillSelectOption } from "@/components/ui/pill-select"
import type { Tables } from "@/lib/supabase/database.types"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, LEAD_TYPES, NO_STATUS_LABEL } from "@/lib/leads/status"

type SalesOption = { id: string; name: string | null; username: string | null; status: string | null }

// null: the viewer is not an Admin and cannot reassign. ok false: the list
// could not be loaded, so the field is left out rather than shown empty.
export type SalesChoices = { ok: true; options: SalesOption[] } | { ok: false } | null

const INITIAL: CustomerFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }

const DATES = [
  { name: "follow_up_date", label: "Follow-up" },
  { name: "appointment", label: "Appointment" },
  { name: "site_survey", label: "Site survey" },
  { name: "quotation", label: "Quotation" },
  { name: "closing", label: "Closing" },
] as const

type Props = {
  customer: Tables<"leads">
  sales: SalesChoices
  // Name of the person currently assigned, when the viewer can see it.
  currentSalesName: string | null
}

/**
 * The profile's edit form in a sheet: a dialog on desktop, a sheet over
 * almost the whole screen on a phone with Save pinned to its bottom edge.
 * `field` is where it opens (the field gets focus); null keeps it closed.
 */
export function EditSheet({
  field,
  onClose,
  onSaved,
  ...props
}: Props & {
  field: CustomerField | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  const close = () => {
    setDirty(false)
    onClose()
  }

  return (
    <Dialog
      open={field !== null}
      onClose={close}
      busy={busy}
      dismissOnBackdrop={!dirty}
      title="Edit customer"
      description="Only the fields you change are saved."
    >
      {field ? (
        <EditForm
          {...props}
          field={field}
          onCancel={close}
          onBusy={setBusy}
          onDirty={() => setDirty(true)}
          onSaved={(message) => {
            setDirty(false)
            onSaved(message)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-line pt-4 first:border-0 first:pt-0">
      <h3 id={id} className="text-[15px] font-medium">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function EditForm({
  customer,
  sales,
  currentSalesName,
  field,
  onCancel,
  onBusy,
  onDirty,
  onSaved,
}: Props & {
  field: CustomerField
  onCancel: () => void
  onBusy: (busy: boolean) => void
  onDirty: () => void
  onSaved: (message: string) => void
}) {
  // The row's updated_at travels with the save; the server refuses it if the
  // row has changed since this form was opened. The form is mounted fresh on
  // every open, so it always carries the row the page shows now.
  const [state, action, pending] = useActionState(async (prev: CustomerFormState, formData: FormData) => {
    onBusy(true)
    try {
      const result = await updateCustomer(customer.id, customer.updated_at ?? "", prev, formData)
      if (result.result === "saved") onSaved(result.message)
      return result
    } catch {
      return {
        ...prev,
        result: "error" as const,
        message: "Nothing was saved: the server could not be reached. Check your connection and try again.",
      }
    } finally {
      onBusy(false)
    }
  }, INITIAL)
  // Ids are prefixed so two forms on one page never share an id.
  const uid = useId()
  const id = (name: CustomerField) => `${uid}-${name}`

  // After a failed save the form shows what was typed, not the stored row.
  const value = (name: CustomerField) => state.values[name] ?? customer[name] ?? ""
  const error = (name: CustomerField) => state.fieldErrors[name]

  const textInput = (name: CustomerField, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={id(name)}
      name={name}
      autoComplete="off"
      defaultValue={value(name)}
      data-autofocus={field === name || undefined}
      className={inputClass}
      {...fieldAria(id(name), error(name))}
      {...extra}
    />
  )

  // A stored value outside today's lists (or none) keeps an option of its own,
  // so saving never rewrites it by accident.
  const storedType = customer.lead_type ?? ""
  const typeOptions: PillSelectOption[] = [
    ...((LEAD_TYPES as readonly string[]).includes(storedType) ? [] : [{ value: storedType, label: storedType || "Not set" }]),
    ...LEAD_TYPES.map((type) => ({ value: type, label: type })),
  ]
  const storedStatus = customer.status ?? ""
  const statusOptions: PillSelectOption[] = [
    ...((LEAD_STATUSES as readonly string[]).includes(storedStatus)
      ? []
      : [{ value: storedStatus, label: storedStatus || NO_STATUS_LABEL }]),
    ...LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_SHORT[status] })),
  ]
  const storedSales = customer.sales_id ?? ""
  const salesOptions: PillSelectOption[] = sales?.ok
    ? [
        { value: "", label: "Unassigned" },
        ...(storedSales && !sales.options.some((option) => option.id === storedSales)
          ? [{ value: storedSales, label: currentSalesName ?? "Current salesperson" }]
          : []),
        ...sales.options.map((option) => ({
          value: option.id,
          label: `${option.name ?? option.username ?? "Unnamed user"}${option.status === "Inactive" ? " (inactive)" : ""}`,
        })),
      ]
    : []

  return (
    <form action={action} onChange={onDirty} noValidate className="flex flex-col gap-5">
      <Group title="Contact">
        <Field label="Name" htmlFor={id("customer_name")} error={error("customer_name")} className="sm:col-span-2">
          {textInput("customer_name", { autoCapitalize: "words" })}
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
        {/* Remounted (key) when the server sends a value back after a failed save. */}
        <PillSelect
          key={`type-${value("lead_type")}`}
          name="lead_type"
          label="Type"
          defaultValue={value("lead_type")}
          options={typeOptions}
          error={error("lead_type")}
          autoFocus={field === "lead_type"}
          onChange={onDirty}
        />
      </Group>

      <Group title="Status and salesperson">
        <PillSelect
          key={`status-${value("status")}`}
          name="status"
          label="Status"
          defaultValue={value("status")}
          options={statusOptions}
          error={error("status")}
          autoFocus={field === "status"}
          onChange={onDirty}
        />
        {sales?.ok ? (
          <PillSelect
            key={`sales-${value("sales_id")}`}
            name="sales_id"
            label="Salesperson"
            defaultValue={value("sales_id")}
            options={salesOptions}
            error={error("sales_id")}
            autoFocus={field === "sales_id"}
            onChange={onDirty}
          />
        ) : null}
        {sales && !sales.ok ? (
          <p className="text-[13px] text-muted sm:col-span-2">
            The salesperson list could not be loaded, so the assignment stays as it is. Reload the page to try again.
          </p>
        ) : null}
        <p className="text-[13px] text-muted sm:col-span-2">A new status starts its day count again.</p>
      </Group>

      <Group title="Pipeline dates">
        {DATES.map((date) => (
          <Field key={date.name} label={date.label} htmlFor={id(date.name)} error={error(date.name)}>
            {textInput(date.name, { type: "date" })}
          </Field>
        ))}
      </Group>

      <section className="flex flex-col gap-4 border-t border-line pt-4">
        <Field label="Notes" htmlFor={id("notes")} error={error("notes")}>
          <textarea
            id={id("notes")}
            name="notes"
            rows={5}
            defaultValue={value("notes")}
            data-autofocus={field === "notes" || undefined}
            className={`${inputClass} py-2.5`}
            {...fieldAria(id("notes"), error("notes"))}
          />
        </Field>
      </section>

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
