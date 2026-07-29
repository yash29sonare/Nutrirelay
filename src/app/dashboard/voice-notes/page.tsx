import { redirect } from "next/navigation"

export default function VoiceNotesPage() {
  redirect("/dashboard/communications?filter=voice")
}
