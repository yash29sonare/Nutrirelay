"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { LogOut } from "lucide-react"
import { logout } from "@/lib/actions/logout"

export function SettingsAccountSection() {
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.refresh()
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle>Logout</CardTitle>
        <CardDescription>Sign out of your account and return to the landing page.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="danger" size="sm" icon={<LogOut size={14} />} onClick={handleLogout}>
          Sign Out
        </Button>
      </CardContent>
    </Card>
  )
}
