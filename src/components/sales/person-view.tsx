import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { Chip } from "@/components/inbox/chips"
import { displayName, formatRelative } from "@/components/inbox/format"
import { buttonClass } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Card, CardHeader, CardHeaderLink } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import type { PersonChats } from "@/lib/data/team"
import { InactivePill, RolePill } from "./team-parts"
import type { TeamPerson } from "./team-model"

/** "< Sales team" above a person's page and its loading and error states. */
export function TeamBackLink() {
  return (
    <Link
      href="/sales"
      className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] pr-2 text-sm text-muted transition-colors duration-[120ms] hover:text-ink md:min-h-9"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Sales team
    </Link>
  )
}

/** Photo or initials, name as the page title, role and status, how they sign in, then the actions. */
export function PersonHeader({ person, isSelf, actions }: { person: TeamPerson; isSelf: boolean; actions: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-5">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar name={person.name} photoUrl={person.photoUrl} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-normal leading-tight tracking-[-0.02em] md:text-[40px]">
            {person.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <RolePill role={person.role} />
            {person.status === "Inactive" ? <InactivePill /> : null}
            <span>{person.username ? `Signs in as ${person.username}` : "No username"}</span>
            {isSelf ? <span>(you)</span> : null}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
    </header>
  )
}

const rowTone = { waiting: "bg-warning-soft", calm: "hover:bg-surface-sunken" } as const

/** Their newest WhatsApp chats, the ones waiting for a person first. */
export function PersonChatsCard({ chats, name, retryHref }: { chats: PersonChats; name: string; retryHref: string }) {
  return (
    <Card className="flex h-full flex-col max-md:p-4">
      <CardHeader
        title="Active chats"
        meta="Taken over by them or assigned to them"
        action={<CardHeaderLink href="/inbox">Inbox</CardHeaderLink>}
      />
      <ChatsBody chats={chats} name={name} retryHref={retryHref} />
    </Card>
  )
}

function ChatsBody({ chats, name, retryHref }: { chats: PersonChats; name: string; retryHref: string }) {
  if (chats.state === "not_set_up") {
    return (
      <EmptyState
        title="WhatsApp is not set up yet"
        detail="The chat tables have not been added to this database. Once they are, chats appear here."
      />
    )
  }
  if (chats.state === "error") {
    return (
      <ErrorState
        title="The chats could not be loaded"
        detail={`${chats.message}. Check your connection and try again.`}
        action={
          <a href={retryHref} className={buttonClass("secondary")}>
            Try again
          </a>
        }
      />
    )
  }
  if (chats.chats.length === 0) {
    return (
      <EmptyState
        title={`No WhatsApp chats for ${name}`}
        detail="A chat shows here once it is assigned to them or they take one over in the inbox."
      />
    )
  }

  const now = new Date()
  return (
    <ul className="-mt-1 divide-y divide-line">
      {chats.chats.map((chat) => (
        <li key={chat.id}>
          <Link
            href={`/inbox/${chat.id}`}
            className={`-mx-2 my-1 flex min-h-14 flex-col gap-1 rounded-[var(--radius-control)] px-2 py-2 transition-colors duration-[120ms] focus-visible:-outline-offset-2 ${rowTone[chat.waiting ? "waiting" : "calm"]}`}
          >
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayName(chat)}</span>
              {chat.last_message_at ? (
                <time dateTime={chat.last_message_at} className="shrink-0 text-xs tabular-nums text-muted">
                  {formatRelative(chat.last_message_at, now)}
                </time>
              ) : null}
            </span>
            {chat.last_message_preview ? (
              <span className="truncate text-xs text-muted">{chat.last_message_preview}</span>
            ) : null}
            {chat.waiting ? (
              <span>
                <Chip tone="warning">Waiting for a person</Chip>
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
