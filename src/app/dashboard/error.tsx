"use client"

import { useEffect } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { ErrorState } from "@/components/ui/ErrorState"
import { Button } from "@/components/ui/Button"
import { RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard error]", error)
  }, [error])

  return (
    <PageContainer>
      <ErrorState
        title="Dashboard error"
        description={error.message ?? "An unexpected error occurred."}
        action={
          <Button variant="brand" size="sm" icon={<RefreshCw size={14} />} onClick={reset}>
            Try again
          </Button>
        }
      />
    </PageContainer>
  )
}
