import type { CSSProperties } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import landing from "./landing.module.css"
import { FocusCards } from "@/components/aceternity"
import { BrandMark } from "@/components/brand/BrandMark"
import { LandingThemeShell, LandingThemeToggle } from "@/components/public/LandingTheme"
import {
  AnimatedList,
  BlurFade,
  BorderBeam,
  Marquee,
  MovingBorder,
  NumberTicker,
  StickyScrollReveal,
} from "@/components/magic-ui"
import { Aurora, BorderGlow, MagicBento, ShinyText, SplitText, SpotlightCard } from "@/components/react-bits"
import { BILLING_PLANS, formatBillingPrice } from "@/lib/billing/plans"

type LandingStyle = CSSProperties & Record<`--${string}`, string | number>

const photos = {
  hero:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
  foodLog:
    "https://images.unsplash.com/photo-1694813646506-135688fc24e4?auto=format&fit=crop&w=1200&q=80",
  mealPrep:
    "https://images.unsplash.com/photo-1543353071-c953d88f7033?auto=format&fit=crop&w=1200&q=80",
  coachDesk:
    "https://images.unsplash.com/photo-1539136952455-b829f716233d?auto=format&fit=crop&w=1200&q=80",
  workspace:
    "https://images.unsplash.com/photo-1758875570137-8691b7c55033?auto=format&fit=crop&w=1200&q=80",
  trainerControl:
    "https://images.unsplash.com/photo-1758875569414-120ebc62ada3?auto=format&fit=crop&w=1200&q=80",
  trainerReview:
    "https://images.unsplash.com/photo-1758875568756-37a9c5c1a4f2?auto=format&fit=crop&w=1200&q=80",
  mealCapture:
    "https://images.unsplash.com/photo-1548809685-e3831a2aaa5f?auto=format&fit=crop&w=1200&q=80",
  planReview:
    "https://images.unsplash.com/photo-1754548930515-ac7eb978280d?auto=format&fit=crop&w=1200&q=80",
  mealSummary:
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
}

const howItWorks = [
  {
    title: "Client sends the meal",
    body: "The update starts as a real food photo or message from the client.",
    image: photos.mealCapture,
  },
  {
    title: "NutriRelay organizes context",
    body: "Meal notes, timing, macros, and review status are grouped into a coach-ready flow.",
    image: photos.planReview,
  },
  {
    title: "Trainer reviews before action",
    body: "The trainer stays responsible for approving notes before they shape client follow-up.",
    image: photos.trainerReview,
  },
  {
    title: "Report is ready",
    body: "Weekly summaries give the trainer enough context to plan the next check-in.",
    image: photos.mealSummary,
  },
]

const workflowItems = [
  {
    label: "Meal photo received",
    detail: "Client stays on WhatsApp",
    accent: "#35c979",
  },
  {
    label: "AI prepared review note",
    detail: "Structured draft, not auto-approved",
    accent: "#4aa7c8",
  },
  {
    label: "Trainer checked macros",
    detail: "Coach judgment stays final",
    accent: "#d7a72b",
  },
  {
    label: "Weekly summary ready",
    detail: "Progress context for follow-up",
    accent: "#28b769",
  },
]

const workflowPainPoints = [
  "Client meal photos should not get buried in WhatsApp.",
  "Weekly reports should not take an entire evening.",
  "Trainers need one review queue, not scattered chats.",
  "Clients stay on WhatsApp. Trainers get the workspace.",
  "AI prepares notes. Trainers make the final call.",
  "Missed follow-ups should be visible before clients drift.",
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
      className={`${landing.photoPanel} relative min-h-[22rem] overflow-hidden rounded-xl bg-cover bg-center ${className}`}
      style={{ "--photo-image": `url(${image})` } as LandingStyle}
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
    <LandingThemeShell className={`${landing.landingShell} min-h-screen overflow-x-hidden`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col px-5 py-5 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between border-b pb-5" style={{ borderColor: "var(--landing-border)" }}>
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-lg" />
            <div>
              <p className={`${landing.eyebrow} text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                Nutrition operations
              </p>
              <p className={`${landing.textPrimary} text-base font-semibold`}>NutriRelay</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LandingThemeToggle
              className={`${landing.themeButtonShell} inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            />
            <Link
              href="/login"
              className={`${landing.primaryButton} inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            >
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 py-10 lg:py-14">
          <BlurFade>
            <section className={`${landing.surface} relative overflow-hidden rounded-2xl border p-5 sm:p-7 lg:p-9`}>
              <Aurora opacity={0.22} />
              <div className="relative z-10 grid gap-9 xl:grid-cols-[minmax(0,0.9fr)_minmax(430px,0.82fr)] xl:items-center">
                <div>
                  <p className={`${landing.card} ${landing.textMuted} mb-5 inline-flex border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em]`}>
                    <ShinyText base="var(--landing-muted)" highlight="var(--landing-ink)">WhatsApp-first coaching</ShinyText>
                  </p>
                  <h1 className={`${landing.textPrimary} max-w-4xl text-4xl font-semibold leading-[1.08] tracking-normal sm:text-5xl lg:text-6xl xl:text-7xl`}>
                    <SplitText text="Nutrition reviews without the WhatsApp clutter." />
                  </h1>
                  <p className={`${landing.textMuted} mt-6 max-w-xl text-base leading-7 sm:text-lg`}>
                    Review meal photos, adherence gaps, and weekly client summaries from one trainer workspace.
                  </p>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <BorderGlow className="inline-flex w-fit shrink-0 rounded-md p-px" glowOpacity={0.48}>
                      <Link
                        href="/login"
                        className={`${landing.primaryButton} inline-flex w-fit items-center gap-2 rounded-[calc(0.375rem-1px)] px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                      >
                        Start <NumberTicker value={7} />-day Pro trial
                        <ArrowRight size={16} />
                      </Link>
                    </BorderGlow>
                    <p className={`${landing.textSubtle} max-w-xs text-sm leading-6`}>
                      No card required. Manual trainer access.
                    </p>
                  </div>
                </div>

                <aside
                  className={`${landing.heroPhoto} relative min-h-[30rem] overflow-hidden rounded-xl bg-cover bg-center`}
                  style={{ "--photo-image": `url(${photos.hero})` } as LandingStyle}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute left-5 top-5 rounded-lg border border-white/14 bg-black/45 px-4 py-3 backdrop-blur">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/65">Today</p>
                    <p className="mt-1 text-lg font-semibold text-white">Meal review ready</p>
                  </div>
                  <AnimatedList className="absolute left-5 right-5 top-28 sm:left-auto sm:w-[20rem]" items={workflowItems} />
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
          </BlurFade>

          <section className="mt-10">
            <BlurFade delay={80}>
              <p className={`${landing.eyebrow} mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                Built around real trainer workflows
              </p>
              <Marquee duration={42}>
                {workflowPainPoints.map((point) => (
                  <div
                    className={`${landing.card} ${landing.textMuted} w-[19rem] rounded-lg border px-4 py-3 text-sm leading-6`}
                    key={point}
                  >
                    {point}
                  </div>
                ))}
              </Marquee>
            </BlurFade>
          </section>

          <section className="mt-14">
            <FocusCards>
              {photoStories.map((story, index) => (
                <BlurFade delay={index * 80} key={story.title}>
                  <PhotoPanel {...story} />
                </BlurFade>
              ))}
            </FocusCards>
          </section>

          <section className="mt-14 border-t pt-10" style={{ borderColor: "var(--landing-border)" }}>
            <BlurFade>
              <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-start">
                <div>
                  <p className={`${landing.eyebrow} text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                    How it works
                  </p>
                  <h2 className={`${landing.textPrimary} mt-2 max-w-md text-3xl font-semibold leading-tight`}>
                    A shorter path from client update to coach action.
                  </h2>
                </div>
                <StickyScrollReveal items={howItWorks} />
              </div>
            </BlurFade>
          </section>

          <section className="mt-14 border-t pt-10" style={{ borderColor: "var(--landing-border)" }}>
            <BlurFade>
              <div className="grid gap-6 lg:grid-cols-[0.65fr_1fr] lg:items-start">
                <div>
                  <p className={`${landing.eyebrow} text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                    Coach workspace
                  </p>
                  <h2 className={`${landing.textPrimary} mt-2 max-w-md text-3xl font-semibold leading-tight`}>
                    Built around the daily nutrition jobs trainers repeat.
                  </h2>
                </div>
                <MagicBento items={bentoItems} />
              </div>
            </BlurFade>
          </section>

          <section className="mt-14 grid gap-6 border-t pt-10 lg:grid-cols-[0.8fr_1.2fr]" style={{ borderColor: "var(--landing-border)" }}>
            <BlurFade>
              <PhotoPanel
                image={photos.workspace}
                eyebrow="Trainer rhythm"
                title="A workspace that feels less like admin."
                body="NutriRelay keeps the review flow calm: intake, adherence, and weekly summaries."
                className="min-h-[25rem]"
              />
            </BlurFade>
            <BlurFade delay={100}>
              <MovingBorder className="h-full rounded-xl">
                <div className={`${landing.card} grid h-full content-center gap-4 rounded-xl border p-6 sm:p-8`}>
                  <div
                    className={`${landing.inlinePhoto} min-h-[13rem] overflow-hidden rounded-lg bg-cover bg-center`}
                    style={{ "--photo-image": `url(${photos.trainerControl})` } as LandingStyle}
                  />
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className={landing.accentText} />
                    <h2 className={`${landing.textPrimary} text-2xl font-semibold`}>Trainer stays in control.</h2>
                  </div>
                  <p className={`${landing.textMuted} max-w-2xl text-sm leading-7`}>
                    AI can prepare notes and group updates, but trainers still review nutrition decisions before action.
                  </p>
                  <div className={`${landing.textPrimary} grid gap-2 text-sm sm:grid-cols-3`}>
                    {["Review first", "Correct logs", "Trace decisions"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 size={15} className={landing.accentText} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </MovingBorder>
            </BlurFade>
          </section>

          <section className="mt-14 border-t pt-10" style={{ borderColor: "var(--landing-border)" }}>
            <BlurFade>
              <div className="mb-7 grid gap-4 lg:grid-cols-[0.72fr_1fr] lg:items-end">
                <div>
                  <p className={`${landing.eyebrow} text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                    Pricing
                  </p>
                  <h2 className={`${landing.textPrimary} mt-2 max-w-2xl text-3xl font-semibold leading-tight`}>
                    Start with a manual pilot, then choose the roster size that fits.
                  </h2>
                </div>
                <p className={`${landing.textMuted} max-w-2xl text-sm leading-6 lg:justify-self-end`}>
                  No fake automatic activation. Payment remains manual QR/UPI with operator verification.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-5">
                {pricingCards.map((plan, index) => {
                  const isPro = plan.key === "pro"
                  const card = (
                    <SpotlightCard
                      className={`${isPro ? landing.pricingPro : landing.card} h-full rounded-xl border p-4`}
                      color={isPro ? "rgba(95, 228, 166, 0.18)" : "rgba(49, 127, 163, 0.12)"}
                    >
                      <div className="relative z-10 flex min-h-full flex-col">
                        <div className="flex min-h-16 items-start justify-between gap-2">
                          <div>
                            <p className={`${landing.textPrimary} text-sm font-semibold`}>{plan.name}</p>
                            <p className={`${landing.textMuted} mt-1 text-xs leading-5`}>{plan.headline}</p>
                          </div>
                          {"badgeLabel" in plan && plan.badgeLabel ? (
                            <span className="rounded-full border border-[var(--landing-accent)]/30 bg-[var(--landing-accent-soft)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--landing-accent-strong)]">
                              <ShinyText base="var(--landing-accent-strong)" highlight="var(--landing-ink)">{plan.badgeLabel}</ShinyText>
                            </span>
                          ) : null}
                        </div>
                        <p className={`${landing.textPrimary} mt-4 text-lg font-semibold`}>
                          {plan.key === "pro" && plan.priceInr ? (
                            <>
                              ₹<NumberTicker value={plan.priceInr} /> {plan.intervalLabel}
                            </>
                          ) : (
                            formatBillingPrice(plan)
                          )}
                        </p>
                        <p className={`${landing.textMuted} mt-1 text-xs leading-5`}>
                          {plan.trialDays ? (
                            <>
                              <NumberTicker value={plan.trialDays} /> days · <NumberTicker value={plan.clientLimit} /> active clients
                            </>
                          ) : plan.clientLimit <= 25 ? (
                            <>
                              <NumberTicker value={plan.clientLimit} /> active clients
                            </>
                          ) : (
                            plan.clientLimitLabel
                          )}
                        </p>
                        <p className={`${landing.textSubtle} mt-4 text-xs leading-5`}>{plan.helperText}</p>
                      </div>
                    </SpotlightCard>
                  )

                  return (
                    <BlurFade delay={index * 70} key={plan.key}>
                      {isPro ? <BorderBeam className="h-full rounded-xl">{card}</BorderBeam> : card}
                    </BlurFade>
                  )
                })}
              </div>
            </BlurFade>
          </section>

          <section className="mt-14 grid gap-6 border-t pt-10 lg:grid-cols-2" style={{ borderColor: "var(--landing-border)" }}>
            <BlurFade>
              <div>
                <p className={`${landing.eyebrow} text-[0.68rem] font-semibold uppercase tracking-[0.16em]`}>
                  Trust and safety
                </p>
                <h2 className={`${landing.textPrimary} mt-2 text-3xl font-semibold leading-tight`}>
                  Nutrition operations software, not medical advice.
                </h2>
              </div>
            </BlurFade>
            <BlurFade delay={100}>
              <div className={`${landing.textMuted} space-y-3 text-sm leading-6`}>
                <p>
                  Trainers remain responsible for consent, coaching judgment, and how AI-assisted notes are used.
                </p>
                <p>
                  WhatsApp workflows depend on Meta platform availability and account setup. NutriRelay should not be
                  used for diagnosis, treatment, or guaranteed outcome claims.
                </p>
              </div>
            </BlurFade>
          </section>

          <BlurFade>
            <section className="mt-14">
              <BorderBeam className="rounded-xl">
                <div className={`${landing.card} overflow-hidden rounded-xl border`}>
                  <div className="grid gap-0 lg:grid-cols-[1fr_0.78fr]">
                    <div className="p-6 sm:p-8">
                      <h2 className={`${landing.textPrimary} text-3xl font-semibold leading-tight`}>
                        Keep nutrition review visual, fast, and trainer-led.
                      </h2>
                      <p className={`${landing.textMuted} mt-4 max-w-2xl text-sm leading-6`}>
                        Meal photos, macro checks, follow-ups, and reports stay in one place.
                      </p>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <BorderGlow className="inline-flex w-fit shrink-0 rounded-md p-px" glowOpacity={0.42}>
                          <Link
                            href="/login"
                            className={`${landing.primaryButton} inline-flex items-center justify-center gap-2 rounded-[calc(0.375rem-1px)] px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                          >
                            Start trial
                            <ArrowRight size={16} />
                          </Link>
                        </BorderGlow>
                        <Link
                          href="/privacy"
                          className={`${landing.secondaryButton} inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-semibold transition-colors`}
                        >
                          Read privacy policy
                        </Link>
                      </div>
                    </div>
                    <div
                      className={`${landing.inlinePhoto} min-h-[18rem] bg-cover bg-center`}
                      style={{ "--photo-image": `url(${photos.mealSummary})` } as LandingStyle}
                    />
                  </div>
                </div>
              </BorderBeam>
            </section>
          </BlurFade>
        </main>

        <footer className="border-t py-5" style={{ borderColor: "var(--landing-border)" }}>
          <div className={`${landing.textSubtle} flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between`}>
            <p>NutriRelay</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <ShieldCheck size={14} />
              <span>Nutrition coaching platform</span>
              <MessageSquareText size={14} />
              <span>WhatsApp-ready workflows</span>
              <ClipboardCheck size={14} />
              <span>Meal review first</span>
              <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--landing-ink)]">
                Privacy
              </Link>
              <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--landing-ink)]">
                Terms
              </Link>
              <Link href="/data-deletion" className="underline underline-offset-2 hover:text-[var(--landing-ink)]">
                Data deletion
              </Link>
              <Link href="/contact" className="underline underline-offset-2 hover:text-[var(--landing-ink)]">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </LandingThemeShell>
  )
}
