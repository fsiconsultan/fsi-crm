"use client"

import { useActionState, useState } from "react"
import { Lock, Pencil, Power, UserPlus } from "lucide-react"
import {
  createSalesperson,
  setSalespersonStatus,
  updateSalesperson,
  type SalesFormState,
  type StatusChangeState,
} from "@/app/(app)/sales/actions"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { pillClass } from "@/components/ui/pill"
import { PillSelect } from "@/components/ui/pill-select"
import { SALES_ROLES, SALES_STATUSES } from "./roles"

const INITIAL: SalesFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }
const STATUS_INITIAL: StatusChangeState = { result: "idle", message: "" }

export type EditablePerson = {
  id: string
  name: string
  username: string | null
  role: string | null
  status: string | null
}

// Each dialog's form state lives in a body component that is remounted (key)
// every time the dialog opens, so a reopened dialog never shows the last
// attempt's error. The opener keeps only "is it open" and the last success.
export function useOpener() {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)
  const [saved, setSaved] = useState<string | null>(null)
  return {
    open,
    session,
    saved,
    show: () => {
      setSaved(null)
      setSession((count) => count + 1)
      setOpen(true)
    },
    close: () => setOpen(false),
    done: (message: string) => {
      setSaved(message)
      setOpen(false)
    },
  }
}

/** The success line after a dialog closed. Failures stay inside the dialog. */
function Saved({ message }: { message: string | null }) {
  return (
    <p role="status" aria-live="polite" className="basis-full text-[13px] text-positive empty:hidden md:text-right">
      {message}
    </p>
  )
}

function FormMessage({ result, message }: { result: string; message: string }) {
  if (result === "error") {
    return (
      <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm text-ink">
        {message}
      </p>
    )
  }
  if (result === "unchanged") {
    return (
      <p role="status" className="text-sm text-muted">
        {message}
      </p>
    )
  }
  return null
}

function Footer({ onCancel, pending, submit, busyLabel }: { onCancel: () => void; pending: boolean; submit: string; busyLabel: string }) {
  return (
    <DialogFooter>
      <button type="button" onClick={onCancel} disabled={pending} className={pillClass("tinted", "justify-center")}>
        Cancel
      </button>
      <button type="submit" disabled={pending} className={pillClass("on", "justify-center")}>
        {pending ? busyLabel : submit}
      </button>
    </DialogFooter>
  )
}

export function AddSalesperson() {
  const opener = useOpener()
  return (
    <>
      <button type="button" onClick={opener.show} className={pillClass("on")}>
        <UserPlus aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        Add salesperson
      </button>
      <Saved message={opener.saved} />
      <AddDialog key={opener.session} open={opener.open} onClose={opener.close} onSaved={opener.done} />
    </>
  )
}

function AddDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const [dirty, setDirty] = useState(false)
  const [state, action, pending] = useActionState(async (prev: SalesFormState, formData: FormData) => {
    const next = await createSalesperson(prev, formData)
    if (next.result === "saved") onSaved(next.message)
    return next
  }, INITIAL)
  const errors = state.fieldErrors

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      dismissOnBackdrop={!dirty}
      title="Add a salesperson"
      description="Creates their login. Every new account starts with the Sales role; change it afterwards with Edit."
    >
      <form action={action} onChange={() => setDirty(true)} noValidate className="flex flex-col gap-4">
        <Field label="Name" htmlFor="new-name" error={errors.name} hint="Shown on their leads and in the team list.">
          <input
            id="new-name"
            data-autofocus
            name="name"
            autoComplete="off"
            defaultValue={state.values.name ?? ""}
            className={inputClass}
            {...fieldAria("new-name", errors.name, true)}
          />
        </Field>
        <Field
          label="Username"
          htmlFor="new-username"
          error={errors.username}
          hint="What they type to sign in. 3 to 30 letters, numbers, dots, dashes or underscores, no spaces. It cannot be changed later."
        >
          <input
            id="new-username"
            name="username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values.username ?? ""}
            className={inputClass}
            {...fieldAria("new-username", errors.username, true)}
          />
        </Field>
        <Field
          label="Starting password"
          htmlFor="new-password"
          error={errors.password}
          hint="At least 6 characters. Give it to them in person: it is not shown again."
        >
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...fieldAria("new-password", errors.password, true)}
          />
        </Field>

        <FormMessage result={state.result} message={state.message} />
        <Footer onCancel={onClose} pending={pending} submit="Create account" busyLabel="Creating account…" />
      </form>
    </Dialog>
  )
}

export function EditSalesperson({ person, isSelf }: { person: EditablePerson; isSelf: boolean }) {
  const opener = useOpener()
  return (
    <>
      <button type="button" onClick={opener.show} aria-label={`Edit ${person.name}`} className={pillClass("tinted")}>
        <Pencil aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        Edit
      </button>
      <EditDialog
        key={opener.session}
        person={person}
        isSelf={isSelf}
        open={opener.open}
        onClose={opener.close}
        onSaved={opener.done}
      />
      <Saved message={opener.saved} />
    </>
  )
}

const roleOptions = (current: string) => [
  ...((SALES_ROLES as readonly string[]).includes(current) ? [] : [{ value: current, label: current || "No role" }]),
  ...SALES_ROLES.map((role) => ({ value: role, label: role })),
]

const statusOptions = (current: string) => [
  ...((SALES_STATUSES as readonly string[]).includes(current) ? [] : [{ value: current, label: current || "No status" }]),
  { value: "Active", label: "Active, can sign in" },
  { value: "Inactive", label: "Inactive, cannot sign in" },
]

/** A field the signed-in Admin may not change on their own account. */
function LockedField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={value} />
      <p className="flex h-11 items-center gap-2 rounded-full bg-surface-sunken px-4 text-sm text-muted md:h-10">
        <Lock aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{value || "Not set"}</span>
      </p>
    </div>
  )
}

function EditDialog({
  person,
  isSelf,
  open,
  onClose,
  onSaved,
}: {
  person: EditablePerson
  isSelf: boolean
  open: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [dirty, setDirty] = useState(false)
  const [state, action, pending] = useActionState(async (prev: SalesFormState, formData: FormData) => {
    const next = await updateSalesperson(person.id, prev, formData)
    if (next.result === "saved") onSaved(next.message)
    return next
  }, INITIAL)
  const errors = state.fieldErrors
  const role = state.values.role ?? person.role ?? ""
  const status = state.values.status ?? person.status ?? ""

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      dismissOnBackdrop={!dirty}
      title={`Edit ${person.name}`}
      description={
        isSelf
          ? "This is your own account, so its role and status are locked. Another Admin can change them."
          : "The role decides what they see: an Admin sees every lead, everyone else only the leads assigned to them."
      }
    >
      <form action={action} onChange={() => setDirty(true)} noValidate className="flex flex-col gap-4">
        <Field label="Name" htmlFor="edit-name" error={errors.name}>
          <input
            id="edit-name"
            data-autofocus
            name="name"
            autoComplete="off"
            defaultValue={state.values.name ?? person.name}
            className={inputClass}
            {...fieldAria("edit-name", errors.name)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {isSelf ? (
            <>
              <LockedField label="Role" name="role" value={role} />
              <LockedField label="Status" name="status" value={status} />
            </>
          ) : (
            <>
              <PillSelect
                key={`role-${role}`}
                name="role"
                label="Role"
                defaultValue={role}
                options={roleOptions(role)}
                error={errors.role}
                onChange={() => setDirty(true)}
              />
              <PillSelect
                key={`status-${status}`}
                name="status"
                label="Status"
                defaultValue={status}
                options={statusOptions(status)}
                error={errors.status}
                onChange={() => setDirty(true)}
              />
            </>
          )}
        </div>
        <p className="text-[13px] text-muted">
          {person.username ? `Signs in as ${person.username}. The username cannot be changed.` : "This account has no username."}
        </p>

        <FormMessage result={state.result} message={state.message} />
        <Footer onCancel={onClose} pending={pending} submit="Save changes" busyLabel="Saving…" />
      </form>
    </Dialog>
  )
}

/** Activate or deactivate, always through a confirm dialog. Not offered on your own account. */
export function StatusButton({ person }: { person: EditablePerson }) {
  const opener = useOpener()
  const inactive = person.status === "Inactive"
  return (
    <>
      <button type="button" onClick={opener.show} className={pillClass("tinted")}>
        <Power aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        {inactive ? "Activate" : "Deactivate"}
      </button>
      <StatusDialog key={opener.session} person={person} open={opener.open} onClose={opener.close} onSaved={opener.done} />
      <Saved message={opener.saved} />
    </>
  )
}

function StatusDialog({
  person,
  open,
  onClose,
  onSaved,
}: {
  person: EditablePerson
  open: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const inactive = person.status === "Inactive"
  const [state, action, pending] = useActionState(async (prev: StatusChangeState, formData: FormData) => {
    const next = await setSalespersonStatus(person.id, prev, formData)
    if (next.result === "saved") onSaved(next.message)
    return next
  }, STATUS_INITIAL)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      title={inactive ? `Activate ${person.name}?` : `Deactivate ${person.name}?`}
      description={
        inactive
          ? "They can sign in again with their username and current password."
          : "They will not be able to sign in. Their leads stay assigned to them until you reassign them, so check their open leads and follow-ups first."
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="status" value={inactive ? "Active" : "Inactive"} />
        <FormMessage result={state.result} message={state.message} />
        <Footer
          onCancel={onClose}
          pending={pending}
          submit={inactive ? "Activate" : "Deactivate"}
          busyLabel={inactive ? "Activating…" : "Deactivating…"}
        />
      </form>
    </Dialog>
  )
}
