import Link from "next/link"
import type { ReactNode } from "react"
import { n } from "@/components/dashboard/format"
import { STALE_DAYS } from "@/lib/leads/filters"
import { PersonPhoto } from "./photo-dialog"
import { InactivePill, LoadBar, RolePill } from "./team-parts"
import { isInactive, personLinks, type TeamRow } from "./team-model"

// The people list. From 1280px each person is one row under plain column
// headers; below that each person is a card. Same markup, so Tab order and
// screen reader labels are the same at every width.

const ROW_GRID =
  "xl:grid xl:items-center xl:gap-x-4 xl:[grid-template-columns:minmax(0,1.5fr)_minmax(0,1.3fr)_64px_72px_88px_72px_var(--chats-col)]"

// The chats column collapses to nothing when WhatsApp is not set up.
const chatsColumn = { on: "[--chats-col:72px]", off: "[--chats-col:0px]" } as const

type Tone = "active" | "inactive"

const nameTone: Record<Tone, string> = { active: "text-ink", inactive: "text-muted" }
const numberTone: Record<Tone, string> = { active: "text-ink", inactive: "text-muted" }
const avatarTone: Record<Tone, string> = { active: "", inactive: "grayscale" }

export function TeamList({
  rows,
  scale,
  range,
  periodLabel,
  currentUserId,
  showChats,
  heading,
}: {
  rows: TeamRow[]
  /** The team's largest number of assigned leads; every bar is drawn against it. */
  scale: number
  range: { from: string; to: string }
  periodLabel: string
  currentUserId: string
  showChats: boolean
  heading?: ReactNode
}) {
  const columns = chatsColumn[showChats ? "on" : "off"]
  return (
    <div className={columns}>
      {heading}
      <div aria-hidden="true" className={`hidden border-b border-line pb-2 text-xs text-muted ${ROW_GRID}`}>
        <span>Person</span>
        <span>Open leads</span>
        <span className="text-right">Deals</span>
        <span className="text-right">New leads</span>
        <span className="text-right">Follow-ups due</span>
        <span className="text-right">Stuck</span>
        <span className="text-right">{showChats ? "Chats" : null}</span>
      </div>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:block xl:divide-y xl:divide-line">
        {rows.map((row) => (
          <PersonRow
            key={row.person.id}
            row={row}
            scale={scale}
            range={range}
            periodLabel={periodLabel}
            isSelf={row.person.id === currentUserId}
            showChats={showChats}
          />
        ))}
      </ul>
    </div>
  )
}

function PersonRow({
  row,
  scale,
  range,
  periodLabel,
  isSelf,
  showChats,
}: {
  row: TeamRow
  scale: number
  range: { from: string; to: string }
  periodLabel: string
  isSelf: boolean
  showChats: boolean
}) {
  const { person, counts } = row
  const tone: Tone = isInactive(person) ? "inactive" : "active"
  const links = personLinks(person.id, range)
  const period = periodLabel.toLowerCase()

  return (
    <li
      className={`flex min-w-0 flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:px-0 xl:py-3 ${ROW_GRID}`}
    >
      <PersonPhoto person={person} avatarClassName={avatarTone[tone]}>
        <Link
          href={`/sales/${person.id}`}
          className={`-my-1 flex min-h-11 items-center gap-1 text-sm font-medium hover:underline xl:min-h-8 ${nameTone[tone]}`}
        >
          <span className="truncate">{person.name}</span>
          {isSelf ? <span className="shrink-0 font-normal text-muted">(you)</span> : null}
        </Link>
        <span className="flex flex-wrap items-center gap-1.5">
          <RolePill role={person.role} />
          {tone === "inactive" ? <InactivePill /> : null}
        </span>
      </PersonPhoto>

      <div className="-mt-2 flex min-w-0 flex-col xl:mt-0 xl:gap-1.5">
        <span className="flex items-baseline justify-between gap-3 text-sm">
          <Link href={links.open} className={`inline-flex min-h-11 items-center gap-1 font-medium tabular-nums hover:underline xl:min-h-0 ${numberTone[tone]}`}>
            {n(counts.open)}
            <span className="font-normal text-muted">open</span>
          </Link>
          <Link href={links.all} className="inline-flex min-h-11 items-center truncate text-xs tabular-nums text-muted hover:underline xl:min-h-0">
            of {n(counts.total)} assigned
          </Link>
        </span>
        <LoadBar open={counts.open} total={counts.total} scale={scale} inactive={tone === "inactive"} />
      </div>

      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 border-t border-line pt-3 sm:grid-cols-5 xl:contents">
        <Stat label="Deals" detail={period} value={counts.deals} href={links.deals} tone={tone} />
        <Stat label="New leads" detail={period} value={counts.added} href={links.added} tone={tone} />
        <Stat label="Follow-ups due" value={counts.followUpsDue} href={links.followUpsDue} tone={tone} alarm />
        <Stat label="Stuck" detail={`over ${STALE_DAYS} days`} value={counts.stale} href={links.stale} tone={tone} alarm />
        {showChats ? (
          <Stat label="Chats waiting" value={row.waitingChats ?? 0} href="/inbox" tone={tone} alarm />
        ) : (
          <div aria-hidden="true" className="hidden xl:block" />
        )}
      </dl>
    </li>
  )
}

// A count that needs action is pink when above zero; zero stays quiet and is not a link.
const statTone = {
  calm: "text-ink",
  alarm: "text-negative",
  zero: "text-muted",
  inactive: "text-muted",
} as const

function Stat({
  label,
  detail,
  value,
  href,
  tone,
  alarm = false,
}: {
  label: string
  /** Read after the label: the period, or the stuck rule. */
  detail?: string
  value: number
  href: string
  tone: Tone
  alarm?: boolean
}) {
  const key = value === 0 ? "zero" : tone === "inactive" ? "inactive" : alarm ? "alarm" : "calm"
  return (
    <div className="flex min-w-0 flex-col xl:items-end">
      <dt className="text-xs text-muted xl:sr-only">
        {label}
        {detail ? <span className="sr-only">, {detail}</span> : null}
      </dt>
      <dd className={`text-[15px] font-medium tabular-nums ${statTone[key]}`}>
        {value > 0 ? (
          <Link href={href} className="-mx-1 inline-flex min-h-11 items-center px-1 hover:underline xl:min-h-8">
            {n(value)}
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center xl:min-h-8">0</span>
        )}
      </dd>
    </div>
  )
}
