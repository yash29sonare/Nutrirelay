import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoadingState } from "@/components/ui/LoadingState"

export default function EventsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Events" description="Immutable event log — loading..." />
      <LoadingState />
    </PageContainer>
  )
}
