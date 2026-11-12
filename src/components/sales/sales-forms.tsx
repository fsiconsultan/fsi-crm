"use client"

import { useActionState, useEffect, useState } from "react"
import { Pencil, UserPlus } from "lucide-react"
import { createSalesperson, updateSalesperson, type SalesFormState } from "@/app/(app)/sales/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { SALES_ROLES, SALES_STATUSES } from "./roles"

const INITIAL: SalesFormState = { result: "idle", message: "", fieldErrors: {}, values: {} }

function FormMessage({ state }: { state: SalesFormState }) {
  if (state.result === "error") {
    return (
      <p role="alert" className="rounded-[var(--radius-control)] bg-negative-soft px-3 py-2.5 text-sm">
        {state.message}
      </p>
    )
  }
  if (state.result === "unchanged") {
    return (
      <p role="status" className="text-sm text-muted">
        {state.message}
      </p>
    )
  }
  return null
}

export function AddSalesperson() {
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
      <Button
        variant="primary"
        onClick={() => {
          setSaved(null)
          setOpen(true)
        }}
      >
        <UserPlus aria-hidden="true" className="size-4" />
        Add salesperson
      </Button>
      {saved ? (
        <p role="status" className="basis-full text-right text-sm text-positive">
          {saved}
        </p>
      ) : null}
      <Dialog
        open={open}
        onClose={close}
        busy={busy}
        dismissOnBackdrop={!dirty}
        title="Add a salesperson"
        description="Creates a login. The account starts with the Sales role; change it afterwards with Edit."
      >
        <AddForm
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

type FormHooks = { onCancel: () => void; onBusy: (busy: boolean) => void; onDirty: () => void }

function AddForm({ onCancel, onBusy, onDirty, onSaved }: FormHooks & { onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(createSalesperson, INITIAL)

  useEffect(() => {
    onBusy(pending)
  }, [pending, onBusy])

  useEffect(() => {
    if (state.result === "saved") onSaved(state.message)
  }, [state, onSaved])

  const errors = state.fieldErrors

  return (
    <form action={action} onChange={onDirty} noValidate className="flex flex-col gap-4">
      <Field label="Name" htmlFor="new-name" error={errors.name}>
        <input
          id="new-name"
          data-autofocus
          name="name"
          autoComplete="off"
          defaultValue={state.values.name ?? ""}
          className={inputClass}
          {...fieldAria("new-name", errors.name)}
        />
      </Field>
      <Field
        label="Username"
        htmlFor="new-username"
        error={errors.username}
        hint="They sign in with this. It cannot be changed here later."
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
        label="Password"
        htmlFor="new-password"
        error={errors.password}
        hint="At least 6 characters. Give it to the person yourself; it is not shown again."
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

      <FormMessage state={state} />

      <DialogFooter>
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </DialogFooter>
    </form>
  )
}

type Member = { id: string; name: string | null; username: string | null; role: string | null; status: string | null }

export function EditSalesperson({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const close = () => {
    setOpen(false)
    setDirty(false)
  }
  const displayName = member.name ?? member.username ?? "this person"

  return (
    <>
      {saved ? (
        <span role="status" className="text-[13px] text-positive">
          {saved}
        </span>
      ) : null}
      <Button
        onClick={() => {
          setSaved(null)
          setOpen(true)
        }}
        aria-label={`Edit ${displayName}`}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Edit
      </Button>
      <Dialog
        open={open}
        onClose={close}
        busy={busy}
        dismissOnBackdrop={!dirty}
        title={`Edit ${displayName}`}
        description={
          isSelf
            ? "This is your own account, so its role and status are locked."
            : "An inactive person cannot sign in. Their leads stay assigned to them."
        }
      >
        <EditForm
          member={member}
          isSelf={isSelf}
          onCancel={close}
          onBusy={setBusy}
          onDirty={() => setDirty(true)}
          onSaved={() => {
            setSaved("Saved")
            close()
          }}
        />
      </Dialog>
    </>
  )
}

function EditForm({
  member,
  isSelf,
  onCancel,
  onBusy,
  onDirty,
  onSaved,
}: FormHooks & {
  member: Member
  isSelf: boolean
  onSaved: () => void
}) {
  const [state, action, pending] = useActionState(updateSalesperson.bind(null, member.id), INITIAL)

  useEffect(() => {
    onBusy(pending)
  }, [pending, onBusy])

  useEffect(() => {
    if (state.result === "saved") onSaved()
  }, [state, onSaved])

  const errors = state.fieldErrors
  const role = state.values.role ?? member.role ?? ""
  const status = state.values.status ?? member.status ?? ""

  return (
    <form action={action} onChange={onDirty} noValidate className="flex flex-col gap-4">
      <Field label="Name" htmlFor="edit-name" error={errors.name}>
        <input
          id="edit-name"
          data-autofocus
          name="name"
          autoComplete="off"
          defaultValue={state.values.name ?? member.name ?? ""}
          className={inputClass}
          {...fieldAria("edit-name", errors.name)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="edit-role" error={errors.role}>
          {/* A disabled select is not submitted, so the locked value travels in a hidden input. */}
          {isSelf ? <input type="hidden" name="role" value={role} /> : null}
          <select
            key={role}
            id="edit-role"
            name={isSelf ? undefined : "role"}
            defaultValue={role}
            disabled={isSelf}
            className={inputClass}
            {...fieldAria("edit-role", errors.role)}
          >
            {(SALES_ROLES as readonly string[]).includes(role) ? null : <option value={role}>{role || "No role"}</option>}
            {SALES_ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="edit-status" error={errors.status}>
          {isSelf ? <input type="hidden" name="status" value={status} /> : null}
          <select
            key={status}
            id="edit-status"
            name={isSelf ? undefined : "status"}
            defaultValue={status}
            disabled={isSelf}
            className={inputClass}
            {...fieldAria("edit-status", errors.status)}
          >
            {(SALES_STATUSES as readonly string[]).includes(status) ? null : (
              <option value={status}>{status || "No status"}</option>
            )}
            {SALES_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FormMessage state={state} />

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
