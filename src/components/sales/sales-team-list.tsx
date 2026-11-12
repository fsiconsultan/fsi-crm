import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/cn"
import type { SalesMember } from "@/lib/data/sales-users"
import { EditSalesperson } from "./sales-forms"

const COLUMNS =
  "md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_100px_110px_auto] md:items-center md:gap-4"

export function SalesTeamList({
  members,
  currentUserId,
}: {
  members: SalesMember[]
  currentUserId: string
}) {
  const active = members.filter((member) => member.status === "Active").length

  return (
    <>
      <p className="mb-3 text-[13px] tabular-nums text-muted">
        {members.length} {members.length === 1 ? "person" : "people"}, {active} active
      </p>
      <div aria-hidden="true" className={`hidden border-b border-line pb-2 text-[13px] text-muted ${COLUMNS}`}>
        <span>Person</span>
        <span>Role</span>
        <span>Status</span>
        <span className="text-right">Assigned leads</span>
        <span className="w-[92px]" />
      </div>
      <ul className="divide-y divide-line">
        {members.map((member) => {
          const name = member.name ?? member.username ?? "Unnamed user"
          const inactive = member.status !== "Active"
          return (
            <li key={member.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5 ${COLUMNS}`}>
              <div className="flex min-w-0 flex-1 basis-[calc(100%-124px)] items-center gap-3 md:basis-auto">
                <Avatar name={name} photoUrl={member.photo_url ?? member.avatar_url} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {name}
                    {member.id === currentUserId ? <span className="font-normal text-muted"> (you)</span> : null}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    {member.username ? `Signs in as ${member.username}` : "No username"}
                  </p>
                </div>
              </div>
              <p className="order-1 whitespace-nowrap text-sm md:order-none">
                <span className="sr-only">Role: </span>
                {member.role ?? <span className="text-muted">No role</span>}
              </p>
              <p className="order-1 md:order-none">
                <span className="sr-only">Status: </span>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    inactive
                      ? "bg-surface-sunken text-muted ring-1 ring-line"
                      : "bg-positive-soft text-[color-mix(in_srgb,var(--positive)_80%,var(--ink))]",
                  )}
                >
                  {member.status ?? "No status"}
                </span>
              </p>
              <p className="order-1 whitespace-nowrap text-sm tabular-nums md:order-none md:text-right">
                {member.leadCount === null ? (
                  <span className="text-muted">Count unavailable</span>
                ) : (
                  <>
                    {member.leadCount.toLocaleString("en-US")}
                    <span className="text-muted md:sr-only"> assigned leads</span>
                  </>
                )}
              </p>
              <div className="flex shrink-0 items-center justify-end gap-2">
                <EditSalesperson
                  member={{
                    id: member.id,
                    name: member.name,
                    username: member.username,
                    role: member.role,
                    status: member.status,
                  }}
                  isSelf={member.id === currentUserId}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
