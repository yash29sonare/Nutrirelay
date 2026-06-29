import Link from "next/link"
import { Dumbbell } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mx-auto">
          <Dumbbell size={22} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">404</h1>
        <p className="text-sm text-[var(--muted)] max-w-xs mx-auto">
          Page not found. The route may be under development or may have moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors px-5 py-2 rounded-lg"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
