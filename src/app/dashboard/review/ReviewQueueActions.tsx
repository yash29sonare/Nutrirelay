"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function ReviewQueueActions({ mealId }: { mealId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function patch(key: string, reviewState: "reviewed" | "rejected") {
    setPending(key)
    try {
      const response = await fetch(`/api/trainer/nutrition-reviews/${mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewState }),
      })
      if (!response.ok) {
        throw new Error("Unable to update review")
      }
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        loading={pending === "reviewed"}
        onClick={() => void patch("reviewed", "reviewed")}
      >
        <CheckCircle size={12} /> Reviewed
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={pending === "rejected"}
        onClick={() => void patch("rejected", "rejected")}
      >
        <XCircle size={12} /> Reject
      </Button>
    </>
  )
}
