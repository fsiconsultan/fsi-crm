import type { ReactNode } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shell/page-header"
import { buttonClass } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { getProfile, isAdmin, type Profile } from "@/lib/auth"
import { cn } from "@/lib/cn"
import { loadAssignees, loadInbox, loadThread, reengageTemplate } from "@/lib/whatsapp/inbox"
import { ConversationList } from "./conversation-list"
import { InboxRealtime } from "./inbox-realtime"
import { InboxNotSetUp } from "./not-set-up"
import { Pane } from "./pane"
import { Thread } from "./thread"

type View = "list" | "thread"

// Three layout states. Below lg one pane shows at a time (/inbox = list,
// /inbox/[id] = thread): next to the sidebar a 768px screen leaves the thread
// about 100px, so the two panes only sit side by side from lg.
const listPane: Record<View, string> = {
  list: "flex",
  thread: "hidden lg:flex",
}

// Phone: the thread is the whole screen under the shell's 61px top bar, pulled out
// of the page padding. md: a card under the page padding. lg: fills the row.
const threadPane: Record<View, string> = {
  list: "hidden lg:flex",
  thread: "-mx-4 -my-6 flex h-[calc(100dvh-61px)] md:mx-0 md:my-0 md:h-[calc(100dvh-4rem)] lg:h-auto",
}

// With a thread open below lg, the thread's own heading replaces the page title.
const headerVisibility: Record<View, string> = {
  list: "",
  thread: "hidden lg:block",
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass("secondary")}>
      {children}
    </Link>
  )
}

function ThreadMessage({ children }: { children: ReactNode }) {
  return <div className="p-4 md:p-6">{children}</div>
}

async function ThreadLoader({ id, profile }: { id: string | null; profile: Profile }) {
  if (!id) {
    return (
      <ThreadMessage>
        <EmptyState
          title="Choose a conversation"
          detail="Pick a conversation from the list to read it, take over from the AI or reply."
        />
      </ThreadMessage>
    )
  }

  const admin = isAdmin(profile)
  const [thread, assignees] = await Promise.all([loadThread(id, profile.id), admin ? loadAssignees() : []])

  if (thread.state === "not_set_up") {
    return (
      <ThreadMessage>
        <EmptyState
          title="The inbox is not set up yet"
          detail="The WhatsApp tables have not been added to this database, so this conversation cannot be loaded."
          action={<LinkButton href="/inbox">Back to conversations</LinkButton>}
        />
      </ThreadMessage>
    )
  }
  if (thread.state === "error") {
    return (
      <ThreadMessage>
        <ErrorState
          title="This conversation could not be loaded"
          detail={thread.message}
          action={<LinkButton href={`/inbox/${id}`}>Try again</LinkButton>}
        />
      </ThreadMessage>
    )
  }
  if (!thread.data) {
    return (
      <ThreadMessage>
        <EmptyState
          title="This conversation is not available"
          detail="It may be assigned to someone else, or it no longer exists."
          action={<LinkButton href="/inbox">Back to conversations</LinkButton>}
        />
      </ThreadMessage>
    )
  }

  return (
    <Thread
      data={thread.data}
      viewer={{ id: profile.id, name: profile.name }}
      admin={admin}
      assignees={assignees}
      template={reengageTemplate()}
      now={new Date()}
    />
  )
}

// Shared by /inbox and /inbox/[id]: the same list and thread, with the route deciding which one a phone shows.
export async function InboxScreen({ selectedId }: { selectedId: string | null }) {
  const profile = await getProfile()
  const inbox = await loadInbox(profile.id)

  if (inbox.state === "not_set_up") {
    return (
      <>
        <PageHeader title="Inbox" />
        <InboxNotSetUp />
      </>
    )
  }

  if (inbox.state === "error") {
    return (
      <>
        <PageHeader title="Inbox" />
        <Card>
          <ErrorState
            title="The inbox could not be loaded"
            detail={inbox.message}
            action={<LinkButton href="/inbox">Try again</LinkButton>}
          />
        </Card>
      </>
    )
  }

  const { conversations, reviewCount } = inbox.data
  const view: View = selectedId ? "thread" : "list"
  const reviewLabel = reviewCount > 0 ? `Needs review (${reviewCount})` : "Needs review"

  return (
    <>
      <InboxRealtime />
      <div className={headerVisibility[view]}>
        <PageHeader title="Inbox" actions={<LinkButton href="/inbox/review">{reviewLabel}</LinkButton>} />
      </div>

      <div className="flex gap-4 lg:h-[calc(100dvh-10rem)]">
        <Pane className={cn("w-full lg:w-[300px] lg:shrink-0 xl:w-[340px]", listPane[view])}>
          <ConversationList conversations={conversations} selectedId={selectedId} now={new Date()} />
        </Pane>
        <Pane frame="screen" className={cn("min-w-0 flex-1", threadPane[view])}>
          <ThreadLoader id={selectedId} profile={profile} />
        </Pane>
      </div>
    </>
  )
}
