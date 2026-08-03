import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react"
import { BrandMark } from "@/components/brand/BrandMark"
import { Aurora, BorderGlow, MagicBento, ShinyText, SplitText, SpotlightCard } from "@/components/react-bits"
import { BILLING_PLANS, formatBillingPrice } from "@/lib/billing/plans"

const workflow = [
  {
    icon: ScanLine,
    label: "Meal review",
    title: "Food photos turn into nutrition notes",
    body: "Review logs, portion gaps, and macro estimates without moving between chats and spreadsheets.",
  },
  {
    icon: BellRing,
    label: "Follow-up",
    title: "Adherence reminders stay on schedule",
    body: "Send WhatsApp nudges when logging drops, before the weekly check-in becomes a rescue call.",
  },
  {
    icon: TrendingUp,
    label: "Reporting",
    title: "Weekly progress is ready to discuss",
    body: "See compliance patterns, missed logs, and nutrition trends before each client conversation.",
  },
]

const howItWorks = [
  "Trainer adds clients and sets the nutrition routine.",
  "Clients send meal updates, photos, and voice notes on WhatsApp.",
  "NutriRelay turns updates into reviewable nutrition logs and adherence signals.",
  "Trainer reviews, corrects, follows up, and tracks weekly progress.",
]

const previewCards = [
  {
    title: "Meal review queue",
    eyebrow: "Needs coach review",
    rows: ["Aarav · breakfast photo", "Priya · skipped lunch", "Neha · voice note parsed"],
    accent: "3 items",
  },
  {
    title: "Client macro snapshot",
    eyebrow: "Today's nutrition",
    rows: ["Protein: on track", "Calories: needs review", "Dinner timing: late"],
    accent: "Coach checks",
  },
  {
    title: "WhatsApp follow-up",
    eyebrow: "Prepared message",
    rows: ["Mention missed breakfast", "Keep tone human", "Trainer approves before sending"],
    accent: "Review first",
  },
  {
    title: "Weekly report",
    eyebrow: "Aarav summary",
    rows: ["5 active logging days", "2 missed meal windows", "Notes ready for call"],
    accent: "Draft",
  },
]

const manualComparison = [
  ["Scattered WhatsApp chats", "One review queue"],
  ["Forgotten meal photos", "Structured food log history"],
  ["Manual macro notes", "AI-assisted nutrition notes"],
  ["No weekly summary", "Trainer-ready report drafts"],
]

const useCases = [
  "Nutrition coach managing many clients",
  "Gym trainer adding diet accountability",
  "Online coach tracking WhatsApp check-ins",
  "Transformation coach preparing weekly summaries",
]

const coachPriorities = [
  "Review meals without scrolling through long WhatsApp threads.",
  "Send reminders that still sound like the trainer.",
  "Open weekly summaries before client check-in calls.",
]

const bentoItems = [
  {
    eyebrow: "WhatsApp inbox",
    title: "Client updates stay tied to the right record",
    body: "Meal messages, media, and follow-up context are organized for trainer review instead of disappearing in chat history.",
    wide: true,
  },
  {
    eyebrow: "AI assisted",
    title: "Text meals become reviewable logs",
    body: "NutriRelay can prepare nutrition notes from clear client messages while keeping trainer approval in the loop.",
  },
  {
    eyebrow: "Media review",
    title: "Photos and voice notes stay visible",
    body: "Food photos and voice-note review items surface where the trainer can inspect them before acting.",
  },
  {
    eyebrow: "Coach control",
    title: "Trainer review queue first",
    body: "Approve, correct, or reject nutrition logs before client-facing actions are taken.",
  },
  {
    eyebrow: "Reports",
    title: "Weekly and monthly summaries",
    body: "Prepare client conversations with adherence, missed meal windows, and nutrition trends in one place.",
  },
  {
    eyebrow: "Manual pilot",
    title: "Trial friendly, no card required",
    body: "Manual QR/UPI verification keeps the pilot honest without claiming automatic payment activation.",
    wide: true,
  },
]

const pricingCards = [
  BILLING_PLANS.trial,
  BILLING_PLANS.starter,
  BILLING_PLANS.growth,
  BILLING_PLANS.pro,
  BILLING_PLANS.agency,
]
const featureVisuals = [
  {
    eyebrow: "Meal review",
    title: "Photo logs with macro context",
    body: "Food photos, client profile, allergies, calories, macros, and coach notes stay together before a trainer approves anything.",
    src: "/landing/meal-review.png",
    alt: "Meal review panel showing Aarav Mehta profile, peanut allergy, protein, carbs, fat, calories, and coach note.",
    className: "lg:col-span-7",
  },
  {
    eyebrow: "Follow-up",
    title: "Reminders tied to real meal gaps",
    body: "Skipped meals, message timing, supportive chat, and the next check-in sit in one simple follow-up flow.",
    src: "/landing/follow-up-queue.png",
    alt: "Follow-up queue showing Priya Rao missed breakfast, reminder time, supportive chat, lunch logged, and macros.",
    className: "lg:col-span-5",
  },
  {
    eyebrow: "Reporting",
    title: "Weekly and monthly nutrition reports",
    body: "Adherence, missed meals, allergies, macro averages, and coach recommendations are ready before the client call.",
    src: "/landing/weekly-monthly-reports.png",
    alt: "Weekly and monthly report cards showing Neha Iyer profile, lactose allergy, adherence, macro averages, and report trend.",
    className: "lg:col-span-6",
  },
  {
    eyebrow: "Review queue",
    title: "Daily trainer actions in order",
    body: "The queue shows what needs review, what can be approved, and which client needs the next reminder.",
    src: "/landing/trainer-queue.png",
    alt: "Trainer queue showing Riya Shah, Kabir client profile, lunch review, macros, approval action, and dinner reminder.",
    className: "lg:col-span-6",
  },
  {
    eyebrow: "Routine timing",
    title: "Timetable, gaps, and adherence counters",
    body: "Breakfast, lunch, dinner, reminders, protein targets, weekly activity, and monthly adherence are visible at a glance.",
    src: "/landing/routine-timing.png",
    alt: "Routine timing board showing Isha Patel profile, gluten allergy, meal timetable, skipped breakfast, protein target, weekly active days, and monthly adherence.",
    className: "lg:col-span-12",
  },
]

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
            <Aurora opacity={0.34} />
            <div className="relative z-10 grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.8fr)] xl:items-start">
            <div>
              <p className="mb-5 inline-flex border border-white/18 bg-black/20 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-[#d6d9dd]">
                <ShinyText base="#d6d9dd" highlight="#ffffff">WhatsApp-first coaching</ShinyText>
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                <SplitText text="Run the nutrition side of coaching from one workspace." />
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#b9bec5] sm:text-lg">
                NutriRelay helps nutrition coaches review food photos, send adherence follow-ups, and prepare
                weekly client reports. It stays focused on nutrition, not workout programming.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <BorderGlow className="inline-flex rounded-md p-px">
                  <Link
                    href="/login"
                    className="inline-flex w-fit items-center gap-2 rounded-[calc(0.375rem-1px)] bg-white px-5 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e6e6e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bdcff]"
                  >
                    Start 7-day Pro trial
                    <ArrowRight size={16} />
                  </Link>
                </BorderGlow>
                <p className="max-w-sm text-sm leading-6 text-[#8f969e]">
                  No card required. Manual access for trainers managing nutrition adherence across active clients.
                </p>
              </div>
            </div>

            <aside className="border border-white/12 bg-[#101418]/90">
              <div className="border-b border-white/12 p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Nutrition desk
                </p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="text-2xl font-semibold text-white">Today&apos;s coach queue</h2>
                  <div className="sm:min-w-32 sm:text-right">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                      Focus
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">Nutrition only</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {workflow.map((item) => (
                  <SpotlightCard key={item.label} className="p-5" color="rgba(95, 228, 166, 0.12)">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#171717] text-[#9bdcff]">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                          {item.label}
                        </p>
                        <h3 className="mt-2 text-base font-semibold leading-6 text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#aeb4bb]">{item.body}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </aside>
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-start">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  How it works
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight text-white">
                  From WhatsApp update to coach action.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#aeb4bb]">
                  NutriRelay does not replace the trainer. It organizes meal updates so the trainer can make
                  faster, more traceable nutrition decisions.
                </p>
                <div className="mt-6 border border-white/10 bg-[#101010] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                      Nutrition timeline
                    </p>
                    <span className="text-xs font-semibold text-[#9bdcff]">Today</span>
                  </div>
                  <div className="space-y-3">
                    {["08:15 · Breakfast photo received", "10:40 · Coach note added", "13:30 · Lunch reminder prepared"].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-md border border-white/8 bg-[#151515] px-3 py-2 text-xs text-[#c7ccd1]">
                        <span className="h-2 w-2 rounded-full bg-[#9bdcff]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                {howItWorks.map((step, index) => (
                  <div key={step} className="flex gap-4 border border-white/10 bg-[#101010] p-4">
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
            <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr] lg:items-start">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  What coaches get
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight text-white">
                  A tighter operating system for nutrition clients.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#aeb4bb]">
                  Built around food logs, review decisions, adherence timing, and weekly progress — not generic
                  chatbots or workout programming.
                </p>
              </div>
              <MagicBento items={bentoItems} />
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
                NutriRelay does not collect card details or claim automatic activation. Payment remains manual
                QR/UPI with operator verification.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
              {pricingCards.map((plan) => {
                const isPro = plan.key === "pro"
                return (
                  <SpotlightCard
                    key={plan.key}
                    className={`rounded-xl border p-4 ${
                      isPro
                        ? "border-[#63ffb7]/55 bg-[#10201a]"
                        : "border-white/10 bg-[#101010]"
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


          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="mb-7 grid gap-4 lg:grid-cols-[0.78fr_1fr] lg:items-end">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Feature visuals
                </p>
                <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight text-white">
                  The nutrition workflow shown as the trainer sees it.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[#aeb4bb] lg:justify-self-end">
                Each view keeps the important coaching context visible: profile, allergies, macros, skipped meals,
                reminders, reports, and the next trainer action.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-12">
              {featureVisuals.map((visual, index) => (
                <article
                  key={visual.title}
                  className={`${visual.className} overflow-hidden border border-white/10 bg-[#101010]`}
                >
                  <div className="grid gap-0 xl:grid-cols-[0.82fr_1fr]">
                    <div className="flex flex-col justify-between border-b border-white/10 p-5 xl:border-b-0 xl:border-r xl:border-white/10">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                          {visual.eyebrow}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold leading-tight text-white">{visual.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#aeb4bb]">{visual.body}</p>
                      </div>
                      <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#9bdcff]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#9bdcff]/35 bg-[#9bdcff]/10">
                          {index + 1}
                        </span>
                        <span>Nutrition operations view</span>
                      </div>
                    </div>
                    <div className="relative min-h-0 overflow-hidden bg-[#080808]">
                      <Image
                        src={visual.src}
                        alt={visual.alt}
                        width={1696}
                        height={960}
                        sizes="(max-width: 1024px) 100vw, 56vw"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Product preview
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
                  Workspace cards for daily nutrition operations.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#aeb4bb]">
                See how meal review, macro context, follow-ups, and weekly summaries sit together in the same workspace.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              {previewCards.map((card) => (
                <article key={card.title} className="border border-white/10 bg-[#101010]">
                  <div className="border-b border-white/10 p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                      {card.eyebrow}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-white">{card.title}</h3>
                  </div>
                  <div className="space-y-2 p-4">
                    {card.rows.map((row) => (
                      <div key={row} className="rounded-md border border-white/8 bg-[#151515] px-3 py-2 text-xs text-[#c7ccd1]">
                        {row}
                      </div>
                    ))}
                    <div className="pt-2 text-xs font-semibold text-[#9bdcff]">{card.accent}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 grid gap-6 border-t border-white/12 pt-10 lg:grid-cols-2">
            <div className="border border-white/10 bg-[#101010] p-6">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-[#9bdcff]" />
                <h2 className="text-2xl font-semibold text-white">Trainer stays in control.</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#b9bec5]">
                AI can assist with nutrition notes, grouping updates, and drafting follow-ups, but trainer review
                remains the operating model. Coaches can correct, reject, merge, and decide what reaches the client.
              </p>
              <div className="mt-5 grid gap-2 text-sm text-[#d8dce0]">
                {["Review before action", "Correct or reject logs", "Traceable coach decisions"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-[#9bdcff]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-[#101010] p-6">
              <div className="flex items-center gap-3">
                <RefreshCw size={18} className="text-[#9bdcff]" />
                <h2 className="text-2xl font-semibold text-white">Less manual follow-up drift.</h2>
              </div>
              <div className="mt-5 divide-y divide-white/10">
                {manualComparison.map(([manual, relay]) => (
                  <div key={manual} className="grid gap-3 py-3 text-sm sm:grid-cols-2">
                    <p className="text-[#858b92]">{manual}</p>
                    <p className="font-medium text-[#d8dce0]">{relay}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                  Use cases
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
                  For trainers who already coach through messages.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {useCases.map((useCase) => (
                  <div key={useCase} className="flex items-start gap-3 border border-white/10 bg-[#101010] p-4">
                    <UserRoundCheck size={17} className="mt-0.5 shrink-0 text-[#9bdcff]" />
                    <p className="text-sm leading-6 text-[#d8dce0]">{useCase}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 border-t border-white/12 pt-10 lg:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                Trust and safety
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
                Built as nutrition operations software, not medical advice.
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[#b9bec5]">
              <p>
                NutriRelay is focused on nutrition adherence workflows. Trainers remain responsible for client
                consent, coaching judgment, and how AI-assisted notes are used.
              </p>
              <p>
                WhatsApp workflows depend on Meta platform availability and account setup. The product should not be
                used for diagnosis, treatment, or guaranteed outcome claims.
              </p>
            </div>
          </section>

          <section className="mt-14 border-t border-white/12 pt-10">
            <div className="mb-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ba2aa]">
                Coach workflow priorities
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
                Built around the jobs trainers repeat every week.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {coachPriorities.map((priority) => (
                <div key={priority} className="border border-white/10 bg-[#101010] p-5 text-sm leading-7 text-[#d8dce0]">
                  {priority}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 border border-white/12 bg-[#101010] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold leading-tight text-white">
                  Built for trainers who want nutrition adherence without more admin.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#aeb4bb]">
                  Keep clients on track, keep coach actions traceable, and keep nutrition review in one workspace.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <BorderGlow className="inline-flex rounded-md p-px">
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
              <Link href="/privacy" className="underline underline-offset-2 hover:text-white">Privacy</Link>
              <Link href="/terms" className="underline underline-offset-2 hover:text-white">Terms</Link>
              <Link href="/data-deletion" className="underline underline-offset-2 hover:text-white">Data deletion</Link>
              <Link href="/contact" className="underline underline-offset-2 hover:text-white">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
