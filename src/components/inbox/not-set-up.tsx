import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"

export function InboxNotSetUp() {
  return (
    <Card>
      <EmptyState
        title="The inbox is not set up yet"
        detail="The WhatsApp tables have not been added to this database. The project owner applies the migration supabase/migrations/20261112090000_whatsapp.sql (see docs/whatsapp.md). After that, conversations appear here."
      />
    </Card>
  )
}
