import Link from "next/link"
import { Dumbbell, UtensilsCrossed, Brain, MessageSquare, BarChart3, Shield } from "lucide-react"

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Meal Tracking",
    description: "Clients log meals with photos. AI extracts macros, confidence scores, and missing information.",
  },
  {
    icon: Brain,
    title: "AI Coaching",
    description: "Automated meal analysis, conversation planning, and engagement recommendations.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Integration",
    description: "Seamless client communication via WhatsApp templates, reminders, and follow-ups.",
  },
  {
    icon: BarChart3,
    title: "Insights & Analytics",
    description: "Compliance rates, trend data, at-risk detection, and performance dashboards.",
  },
  {
    icon: Shield,
    title: "Event Sourcing",
    description: "Immutable audit trail for every action. Full transparency and accountability.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-[var(--foreground)]">NutriRelay</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors px-4 py-1.5 rounded-lg"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mx-auto mb-6">
            <Dumbbell size={26} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight leading-tight">
            Train smarter with
            <span className="text-brand-500"> AI-powered coaching</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
            NutriRelay gives trainers the tools to track meals, automate follow-ups, and keep every client on track — all from one dashboard.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-brand-500 text-white hover:bg-brand-600 transition-colors px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-[var(--surface-border)] text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-colors px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--surface-border)] p-5 hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 mb-4">
                  <f.icon size={18} className="text-brand-500" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{f.title}</h3>
                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--surface-border)] py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">NutriRelay</p>
          <p className="text-xs text-[var(--muted)]">Trainer platform</p>
        </div>
      </footer>
    </div>
  )
}
