import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoadingState } from "@/components/ui/LoadingState"

export default function ConversationsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Conversations" description="Review and manage client conversation plans." />
      <LoadingState />
    </PageContainer>
  )
}
