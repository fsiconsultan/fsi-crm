import { InboxScreen } from "@/components/inbox/inbox-screen"

export const metadata = { title: "Conversation" }

// The deep link for one conversation: a phone opens straight to the thread.
export default async function ConversationPage({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params
  return <InboxScreen selectedId={id} />
}
