import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { BrandMark } from "@/components/brand/BrandMark"
import { Aurora, BorderGlow, MagicBento, ShinyText, SplitText, SpotlightCard } from "@/components/react-bits"
import { BILLING_PLANS, formatBillingPrice } from "@/lib/billing/plans"

const photos = {
  hero:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
  foodLog:
    "https://images.unsplash.com/photo-1694813646506-135688fc24e4?auto=format&fit=crop&w=1200&q=80",
  mealPrep:
    "https://images.unsplash.com/photo-1543353071-c953d88f7033?auto=format&fit=crop&w=1200&q=80",
  coachDesk:
    "https://images.unsplash.com/photo-1725563304176-836f79e7e464?auto=format&fit=crop&w=1200&q=80",
  workspace:
    "https://images.unsplash.com/photo-1758875570137-8691b7c55033?auto=format&fit=crop&w=1200&q=80",
  trainerControl:
    "https://images.unsplash.com/photo-1758875569414-120ebc62ada3?auto=format&fit=crop&w=1200&q=80",
}

const howItWorks = [
  "Client sends a meal update on WhatsApp.",
  "NutriRelay groups the photo, note, and macro context.",
  "Trainer reviews, corrects, and follows up from one workspace.",
]

const bentoItems = [
  {
    eyebrow: "WhatsApp inbox",
    title: "Meal updates stay organized",
    body: "Food messages, photos, and review context are tied to the correct client instead of getting buried in chat.",
    wide: true,
  },
  {
    eyebrow: "AI assisted",
    title: "Clear meals become draft nutrition logs",
    body: "NutriRelay prepares structured notes while keeping trainer approval in the loop.",
  },
  {
    eyebrow: "Coach control",
    title: "Review before action",
    body: "Approve, correct, or reject nutrition logs before they shape client follow-ups.",
  },
  {
    eyebrow: "Reports",
    title: "Weekly summaries are easier to prepare",
    body: "Adherence, missed meal windows, and macro trends sit where the trainer can act on them.",
    wide: true,
  },
]

const photoStories = [
  {
    eyebrow: "Food photo review",
    title: "Clients share what they actually ate.",
    body: "The coach sees the meal, the message, and the review decision together.",
    image: photos.foodLog,
  },
  {
    eyebrow: "Meal prep context",
    title: "Routine meals become easier to track.",
    body: "Patterns across lunch boxes, portions, and missed windows stay visible.",
    image: photos.mealPrep,
  },
  {
    eyebrow: "Coach workspace",
    title: "Nutrition operations need a calm desk.",
    body: "Daily reviews, follow-ups, and reports sit in one focused trainer view.",
    image: photos.coachDesk,
  },
]

const pricingCards = [
  BILLING_PLANS.trial,
  BILLING_PLANS.starter,
  BILLING_PLANS.growth,
  BILLING_PLANS.pro,
  BILLING_PLANS.agency,
]

function PhotoPanel({
  image,
  eyebrow,
  title,
  body,
  className = "",
}: {
  image: string
  eyebrow: string
  title: string
  body: string
  className?: string
}) {
  return (
    <article
      className={`relative min-h-[22rem] overflow-hidden rounded-xl border border-white/12 bg-cover bg-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8, 8, 8, 0.08), rgba(8, 8, 8, 0.78)), url(${image})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative flex h-full min-h-[22rem] flex-col justify-end p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/75">{eyebrow}</p>
        <h3 className="mt-2 max-w-sm text-2xl font-semibold leading-tight text-white">{title}</h3>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/78">{body}</p>
      </div>
    </article>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080808] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col px-5 py-5 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/12 pb-5">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-lg" />
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#aeb4bb]">
                Nutrition operations
              </p>
              <p className="text-base font-semibold text-white">NutriRelay</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-white/18 bg-white px-4 py-2 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e6e6e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bdcff]"
          >
            Sign in
          </Link>
        </header>

        <main className="flex-1 py-10 lg:py-14">
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f12] p-5 sm:p-7 lg:p-9">
            <Aurora opacity={0.28} />
            <div className="relative z-10 grid gap-9 xl:grid-cols-[minmax(0,0.9fr)_minmax(430px,0.82fr)] xl:items-center">
              <div>
                <p className="mb-5 inline-flex border border-white/18 bg-black/20 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-[#d6d9dd]">
                  <ShinyText base="#d6d9dd" highlight="#ffffff">WhatsApp-first coaching</ShinyText>
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                  <SplitText text="Nutrition reviews without the WhatsApp clutter." />
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-[#b9bec5] sm:text-lg">
                  Review meal photos, adherence gaps, and weekly client summaries from one trainer workspace.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <BorderGlow className="inline-flex w-fit shrink-0 rounded-md p-px">
                    <Link
                      href="/login"
                      className="inline-flex w-fit items-center gap-2 rounded-[calc(0.375rem-1px)] bg-white px-5 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e6e6e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bdcff]"
                    >
                      Start 7-day Pro trial
                      <ArrowRight size={16} />
                    </Link>
                  </BorderGlow>
                  <p className="max-w-xs text-sm leading-6 text-[#8f969e]">No card required. Manual trainer access.</p>
                </div>
              </div>

              <aside
                className="relative min-h-[28rem] overflow-hidden rounded-xl border border-white/12 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(8, 8, 8, 0.04), rgba(8, 8, 8, 0.66)), url(${photos.hero})`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute left-5 top-5 rounded-lg border border-white/14 bg-black/45 px-4 py-3 backdrop-blur">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/65">Today</p>
                  <p className="mt-1 text-lg font-semibold text-white">Meal review ready</p>
                </div>
                <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-3">
                  {["Photos", "Macros", "Follow-ups"].map((item) => (
                    <div key={item} className="rounded-lg border border-white/14 bg-black/45 p-3 backdrop-blur">
                      <p className="text-xs font-semibold text-white">{item}</p>
                      <p className="mt-1 text-[0.72rem] text-white/65">Trainer checked</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-14 grid gap-5 lg:grid-cols-3">
            {photoStories.map((story) => (
              <PhotoPanel key={story.title} {...story} />
            ))}
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-start">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  How it works
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight text-white">
                  A shorter path from client update to coach action.
                </h2>
              </div>
              <div className="grid gap-3">
                {howItWorks.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-lg border border-white/10 bg-[#101010] p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#171717] text-sm font-semibold text-[#9bdcff]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-[#d8dce0]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="grid gap-6 lg:grid-cols-[0.65fr_1fr] lg:items-start">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Coach workspace
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight text-white">
                  Built around the daily nutrition jobs trainers repeat.
                </h2>
              </div>
              <MagicBento items={bentoItems} />
            </div>
          </section>

          <section className="mt-14 grid gap-6 border-t border-white/12 pt-10 lg:grid-cols-[0.8fr_1.2fr]">
            <PhotoPanel
              image={photos.workspace}
              eyebrow="Trainer rhythm"
              title="A workspace that feels less like admin."
              body="NutriRelay keeps the review flow calm: intake, adherence, and weekly summaries."
              className="min-h-[25rem]"
            />
            <div className="grid content-center gap-4 rounded-xl border border-white/10 bg-[#101010] p-6 sm:p-8">
              <div
                className="min-h-[13rem] rounded-lg bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(8, 8, 8, 0.02), rgba(8, 8, 8, 0.34)), url(${photos.trainerControl})`,
                }}
              />
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-[#9bdcff]" />
                <h2 className="text-2xl font-semibold text-white">Trainer stays in control.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[#b9bec5]">
                AI can prepare notes and group updates, but trainers still review nutrition decisions before action.
              </p>
              <div className="grid gap-2 text-sm text-[#d8dce0] sm:grid-cols-3">
                {["Review first", "Correct logs", "Trace decisions"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-[#9bdcff]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="mb-7 grid gap-4 lg:grid-cols-[0.72fr_1fr] lg:items-end">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Pricing
                </p>
                <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight text-white">
                  Start with a manual pilot, then choose the roster size that fits.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[#aeb4bb] lg:justify-self-end">
                No fake automatic activation. Payment remains manual QR/UPI with operator verification.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
              {pricingCards.map((plan) => {
                const isPro = plan.key === "pro"
                return (
                  <SpotlightCard
                    key={plan.key}
                    className={`rounded-xl border p-4 ${
                      isPro ? "border-[#63ffb7]/55 bg-[#10201a]" : "border-white/10 bg-[#101010]"
                    }`}
                    color={isPro ? "rgba(95, 228, 166, 0.22)" : "rgba(155, 220, 255, 0.12)"}
                  >
                    <div className="relative z-10 flex min-h-full flex-col">
                      <div className="flex min-h-16 items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{plan.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[#aeb4bb]">{plan.headline}</p>
                        </div>
                        {"badgeLabel" in plan && plan.badgeLabel ? (
                          <span className="rounded-full border border-[#63ffb7]/30 bg-[#63ffb7]/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#a7ffd1]">
                            <ShinyText base="#a7ffd1" highlight="#ffffff">{plan.badgeLabel}</ShinyText>
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-lg font-semibold text-white">{formatBillingPrice(plan)}</p>
                      <p className="mt-1 text-xs leading-5 text-[#aeb4bb]">{plan.clientLimitLabel}</p>
                      <p className="mt-4 text-xs leading-5 text-[#8f969e]">{plan.helperText}</p>
                    </div>
                  </SpotlightCard>
                )
              })}
            </div>
          </section>

          <section className="mt-14 grid gap-6 border-t border-white/12 pt-10 lg:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                Trust and safety
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
                Nutrition operations software, not medical advice.
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[#b9bec5]">
              <p>
                Trainers remain responsible for consent, coaching judgment, and how AI-assisted notes are used.
              </p>
              <p>
                WhatsApp workflows depend on Meta platform availability and account setup. NutriRelay should not be
                used for diagnosis, treatment, or guaranteed outcome claims.
              </p>
            </div>
          </section>

          <section className="mt-14 overflow-hidden rounded-xl border border-white/12 bg-[#101010]">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.78fr]">
              <div className="p-6 sm:p-8">
                <h2 className="text-3xl font-semibold leading-tight text-white">
                  Keep nutrition review visual, fast, and trainer-led.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#aeb4bb]">
                  Meal photos, macro checks, follow-ups, and reports stay in one place.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <BorderGlow className="inline-flex w-fit shrink-0 rounded-md p-px">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-[calc(0.375rem-1px)] bg-white px-5 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e6e6e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bdcff]"
                    >
                      Start trial
                      <ArrowRight size={16} />
                    </Link>
                  </BorderGlow>
                  <Link
                    href="/privacy"
                    className="inline-flex items-center justify-center rounded-md border border-white/18 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/8"
                  >
                    Read privacy policy
                  </Link>
                </div>
              </div>
              <div
                className="min-h-[18rem] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(8, 8, 8, 0.02), rgba(8, 8, 8, 0.34)), url(${photos.mealPrep})`,
                }}
              />
            </div>
          </section>
        </main>

        <footer className="border-t border-white/12 py-5">
          <div className="flex flex-col gap-3 text-xs text-[#858b92] md:flex-row md:items-center md:justify-between">
            <p>NutriRelay</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <ShieldCheck size={14} />
              <span>Nutrition coaching platform</span>
              <MessageSquareText size={14} />
              <span>WhatsApp-ready workflows</span>
              <ClipboardCheck size={14} />
              <span>Meal review first</span>
              <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="underline underline-offset-2 hover:text-white">
                Terms
              </Link>
              <Link href="/data-deletion" className="underline underline-offset-2 hover:text-white">
                Data deletion
              </Link>
              <Link href="/contact" className="underline underline-offset-2 hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
