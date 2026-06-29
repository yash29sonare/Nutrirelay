import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoadingState } from "@/components/ui/LoadingState"

export default function ClientsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Clients" description="Manage your client roster." />
      <LoadingState />
    </PageContainer>
  )
}
