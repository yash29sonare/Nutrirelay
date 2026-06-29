import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoadingState } from "@/components/ui/LoadingState"

export default function EngagementLoading() {
  return (
    <PageContainer>
      <PageHeader title="Engagement" description="AI-powered action recommendations." />
      <LoadingState />
    </PageContainer>
  )
}
