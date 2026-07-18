import { createClient } from "@supabase/supabase-js";
import { runAI } from "@/ai/aiGateway";
import { geminiModels } from "@/mastra/config";
import { sendDocumentMessage } from "@/lib/whatsapp/send";
import { countsTowardMacros } from "@/lib/meals/reviewRules";
import { buildSimplePdf, wrapText, type PdfLine } from "@/lib/pdf/weekly-report";
import type { MealReviewState } from "@/types/meal";

const REPORTS_BUCKET = "weekly-reports";
const WEEK_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ClientLink {
  trainer_id: string;
  client_id: string;
  profiles: { full_name: string | null; phone_number: string | null } | null;
}

interface FoodLogRow {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  verification_status: string;
  review_state?: string | null;
  logged_at: string;
}

export interface WeeklyClientSummaryInput {
  foodLogs: Array<FoodLogRow & { review_state?: string | null }>;
  communicationLogs: Array<{
    direction?: string | null;
    message_type?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string | null;
  }>;
  goal?: {
    goal_type?: string | null;
    target_weight?: number | null;
    starting_weight?: number | null;
    current_weight?: number | null;
  } | null;
  healthProfile?: {
    weight_kg?: number | null;
  } | null;
  workoutSchedule?: {
    workout_time?: string | null;
    rest_days?: string[] | null;
    checkin_preference?: string | null;
    breakfast_time?: string | null;
    lunch_time?: string | null;
    snack_time?: string | null;
    dinner_time?: string | null;
  } | null;
}

export interface WeeklyClientReportSummary {
  mealsLogged: number;
  followedMeals: number;
  skippedMeals: number;
  outsideFoodEvents: number;
  alternativeMeals: number;
  reviewNeededItems: number;
  macroTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goalContext: {
    goalType: string | null;
    startingWeight: number | null;
    currentWeight: number | null;
    targetWeight: number | null;
    weightChange: number | null;
  };
  routineConsistency: {
    activeLogDays: number;
    hasRoutineTimes: boolean;
    workoutTime: string | null;
    restDays: string[];
    checkinPreference: string | null;
  };
  projection: "on_track" | "behind" | "ahead" | "insufficient_data";
  trainerNotes: string[];
}

interface WeeklyAggregate {
  logCount: number;
  totalCalories: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  verifiedCount: number;
  verifiedPct: number;
  streakDays: number;
  complianceScore: number;
  riskLabel: string;
}

export interface WeeklyReportSummary {
  evaluated: number;
  generated: number;
  sent: number;
  skippedNoData: number;
  errors: number;
}

export function getAmbiguousWeeklyReportClientIds(
  links: Array<Pick<ClientLink, "trainer_id" | "client_id">>,
): Set<string> {
  const trainerIdsByClient = new Map<string, Set<string>>();

  for (const link of links) {
    const trainerIds = trainerIdsByClient.get(link.client_id) ?? new Set<string>();
    trainerIds.add(link.trainer_id);
    trainerIdsByClient.set(link.client_id, trainerIds);
  }

  return new Set(
    [...trainerIdsByClient.entries()]
      .filter(([, trainerIds]) => trainerIds.size > 1)
      .map(([clientId]) => clientId),
  );
}

export function filterReportableFoodLogs<T extends { review_state?: string | null }>(logs: T[]): T[] {
  return logs.filter((log) => countsTowardMacros(log.review_state as MealReviewState | null | undefined));
}

// ── Aggregate a week of food logs into report metrics ──────────────────────────
function aggregate(logs: FoodLogRow[]): WeeklyAggregate {
  const logCount = logs.length;
  if (logCount === 0) {
    return {
      logCount: 0, totalCalories: 0, avgCalories: 0, avgProtein: 0,
      avgCarbs: 0, avgFat: 0, verifiedCount: 0, verifiedPct: 0, streakDays: 0,
      complianceScore: 0, riskLabel: "No Data",
    };
  }

  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, verifiedCount = 0;
  const daysWithLogs = new Set<string>();

  for (const log of logs) {
    totalCalories += Number(log.calories ?? 0);
    totalProtein += Number(log.protein_g ?? 0);
    totalCarbs += Number(log.carbs_g ?? 0);
    totalFat += Number(log.fat_g ?? 0);
    if (log.verification_status === "VERIFIED") verifiedCount++;
    daysWithLogs.add(log.logged_at.slice(0, 10));
  }

  const round = (n: number) => Math.round(n * 10) / 10;
  const expectedMeals = 21;
  const mealScore = Math.min(100, (logCount / expectedMeals) * 100);
  const verificationScore = (verifiedCount / logCount) * 100;
  const consistencyScore = (daysWithLogs.size / 7) * 100;
  const complianceScore = Math.round(mealScore * 0.4 + verificationScore * 0.3 + consistencyScore * 0.3);
  const riskLabel = complianceScore >= 70 ? "On Track" : complianceScore >= 40 ? "At Risk" : "Critical";

  return {
    logCount,
    totalCalories: Math.round(totalCalories),
    avgCalories: Math.round(totalCalories / logCount),
    avgProtein: round(totalProtein / logCount),
    avgCarbs: round(totalCarbs / logCount),
    avgFat: round(totalFat / logCount),
    verifiedCount,
    verifiedPct: Math.round((verifiedCount / logCount) * 100),
    streakDays: daysWithLogs.size,
    complianceScore,
    riskLabel,
  };
}

export function buildWeeklyClientReportSummary(input: WeeklyClientSummaryInput): WeeklyClientReportSummary {
  const logs = filterReportableFoodLogs(input.foodLogs);
  const communicationLogs = input.communicationLogs;
  const activeLogDays = new Set(logs.map((log) => log.logged_at.slice(0, 10))).size;
  const macroTotals = logs.reduce(
    (totals, log) => ({
      calories: totals.calories + Number(log.calories ?? 0),
      protein: totals.protein + Number(log.protein_g ?? 0),
      carbs: totals.carbs + Number(log.carbs_g ?? 0),
      fat: totals.fat + Number(log.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  let followedMeals = 0;
  let skippedMeals = 0;
  let outsideFoodEvents = 0;
  let alternativeMeals = 0;

  for (const log of communicationLogs) {
    const metadata = log.metadata ?? {};
    const structured = metadata["structured_response"];
    const adherence = typeof metadata["adherence_status"] === "string"
      ? metadata["adherence_status"]
      : structured && typeof structured === "object" && "adherence_status" in structured
        ? String((structured as Record<string, unknown>)["adherence_status"])
        : null;
    const selected = structured && typeof structured === "object"
      ? String((structured as Record<string, unknown>)["selected_option"] ?? "")
      : "";
    const combined = `${adherence ?? ""} ${selected}`.toLowerCase();

    if (combined.includes("follow")) followedMeals++;
    if (combined.includes("skip")) skippedMeals++;
    if (combined.includes("outside")) outsideFoodEvents++;
    if (combined.includes("alternative")) alternativeMeals++;
  }

  const reviewNeededItems = logs.filter((log) =>
    log.review_state === "needs_review" ||
    log.review_state === "pending" ||
    log.verification_status === "NEEDS_REVIEW",
  ).length;

  const startingWeight = input.goal?.starting_weight ?? null;
  const currentWeight = input.goal?.current_weight ?? input.healthProfile?.weight_kg ?? null;
  const targetWeight = input.goal?.target_weight ?? null;
  const weightChange = startingWeight !== null && currentWeight !== null
    ? Math.round((currentWeight - startingWeight) * 10) / 10
    : null;
  let projection: WeeklyClientReportSummary["projection"] = "insufficient_data";
  if (targetWeight !== null && currentWeight !== null && startingWeight !== null && startingWeight !== targetWeight) {
    const desiredDirection = targetWeight > startingWeight ? 1 : -1;
    const actualDirection = currentWeight > startingWeight ? 1 : currentWeight < startingWeight ? -1 : 0;
    projection = actualDirection === 0 ? "behind" : actualDirection === desiredDirection ? "on_track" : "behind";
  } else if (logs.length >= 7 || followedMeals > 0) {
    projection = skippedMeals + outsideFoodEvents > followedMeals ? "behind" : "on_track";
  }

  const schedule = input.workoutSchedule;
  const hasRoutineTimes = Boolean(schedule?.breakfast_time || schedule?.lunch_time || schedule?.snack_time || schedule?.dinner_time);
  const trainerNotes = [
    `${logs.length} meals logged across ${activeLogDays} day${activeLogDays === 1 ? "" : "s"}.`,
    `${reviewNeededItems} item${reviewNeededItems === 1 ? "" : "s"} need trainer review.`,
    projection === "behind" ? "Trend is behind the stated goal or adherence pattern." : null,
  ].filter((note): note is string => Boolean(note));

  return {
    mealsLogged: logs.length,
    followedMeals,
    skippedMeals,
    outsideFoodEvents,
    alternativeMeals,
    reviewNeededItems,
    macroTotals: {
      calories: Math.round(macroTotals.calories),
      protein: Math.round(macroTotals.protein * 10) / 10,
      carbs: Math.round(macroTotals.carbs * 10) / 10,
      fat: Math.round(macroTotals.fat * 10) / 10,
    },
    goalContext: {
      goalType: input.goal?.goal_type ?? null,
      startingWeight,
      currentWeight,
      targetWeight,
      weightChange,
    },
    routineConsistency: {
      activeLogDays,
      hasRoutineTimes,
      workoutTime: schedule?.workout_time ?? null,
      restDays: schedule?.rest_days ?? [],
      checkinPreference: schedule?.checkin_preference ?? null,
    },
    projection,
    trainerNotes,
  };
}

// ── Gemini narrative via failover cascade (primary → fallback1 → fallback2) ────
async function generateNarrative(
  clientName: string,
  agg: WeeklyAggregate
): Promise<string> {
  const prompt = `Write a concise, motivational 2-3 paragraph weekly fitness performance evaluation for a client named ${clientName}.
Base it ONLY on these numbers from the past 7 days:
- Meals logged: ${agg.logCount} across ${agg.streakDays} distinct days
- Average daily calories per logged meal: ${agg.avgCalories} kcal
- Average macros per meal: ${agg.avgProtein}g protein, ${agg.avgCarbs}g carbs, ${agg.avgFat}g fat
- Photo-verified logs: ${agg.verifiedPct}% (${agg.verifiedCount}/${agg.logCount})
- Compliance score: ${agg.complianceScore}/100 — ${agg.riskLabel}

Be specific to these numbers, factual, and encouraging without empty praise. Plain text only, no markdown, no headings.`;

  try {
    // AI-GATEWAY-ENFORCED
    const { text } = await runAI({
      prompt,
      feature: "weekly-report",
      modelTiers: [geminiModels.primary, geminiModels.fallback1, geminiModels.fallback2],
    });
    const trimmed = (text ?? "").trim();
    if (trimmed) return trimmed;
  } catch (err) {
    console.error("[weekly-report] narrative all tiers failed:", (err as Error).message);
  }

  // Hard fallback — data-only narrative, report still ships on schedule
  return (
    `Weekly summary for ${clientName}. You logged ${agg.logCount} meals across ` +
    `${agg.streakDays} days this week, averaging ${agg.avgCalories} kcal per meal ` +
    `(${agg.avgProtein}g protein, ${agg.avgCarbs}g carbs, ${agg.avgFat}g fat). ` +
    `${agg.verifiedPct}% of your logs were photo-verified. Keep the momentum going next week.`
  );
}

// ── Compose the PDF line list ──────────────────────────────────────────────────
function buildReportLines(
  clientName: string,
  weekStart: string,
  weekEnd: string,
  agg: WeeklyAggregate,
  narrative: string
): PdfLine[] {
  const lines: PdfLine[] = [
    { text: "Fortress Fitness Pro", size: 20, bold: true, gap: 0 },
    { text: "Weekly Performance Report", size: 13, bold: true, gap: 1 },
    { text: `Client: ${clientName}`, size: 11 },
    { text: `Week: ${weekStart}  to  ${weekEnd}`, size: 11, gap: 1 },
    { text: "Macro Adherence", size: 13, bold: true },
    { text: `Meals logged: ${agg.logCount}  (${agg.streakDays} active days)`, size: 11 },
    { text: `Avg calories / meal: ${agg.avgCalories} kcal`, size: 11 },
    { text: `Avg protein: ${agg.avgProtein} g    Avg carbs: ${agg.avgCarbs} g    Avg fat: ${agg.avgFat} g`, size: 11 },
    { text: `Photo-verified: ${agg.verifiedPct}%  (${agg.verifiedCount}/${agg.logCount})`, size: 11 },
    { text: `Compliance Score: ${agg.complianceScore}/100 (${agg.riskLabel})`, size: 11, gap: 1 },
    { text: "Coach Evaluation", size: 13, bold: true },
  ];

  for (const paragraph of narrative.split(/\n+/)) {
    for (const wrapped of wrapText(paragraph)) {
      lines.push({ text: wrapped, size: 11 });
    }
    lines.push({ text: "", size: 11 });
  }

  lines.push({ text: "Powered by Fortress Fitness Pro", size: 9 });
  return lines;
}

/**
 * Weekly report pipeline. For each active client, aggregates the week's food
 * logs, generates a Gemini narrative (with model cascade + hard fallback),
 * builds a PDF, uploads it to the `weekly-reports` bucket, sends it as a
 * WhatsApp document, and records a `weekly_reports` audit row.
 *
 * Recommended schedule: Sundays 22:00 IST (16:30 UTC) via `/api/cron?action=reports`.
 */
export async function generateWeeklyReports(): Promise<WeeklyReportSummary> {
  const db = getDb();
  const summary: WeeklyReportSummary = {
    evaluated: 0, generated: 0, sent: 0, skippedNoData: 0, errors: 0,
  };

  const now = Date.now();
  const weekStartMs = now - WEEK_DAYS * MS_PER_DAY;
  const weekStartIso = new Date(weekStartMs).toISOString();
  const weekStartDate = weekStartIso.slice(0, 10);
  const weekEndDate = new Date(now).toISOString().slice(0, 10);

  // Active client links with profile contact info.
  const { data: links, error } = await db
    .from("trainer_clients")
    .select(
      `trainer_id, client_id, profiles!trainer_clients_client_id_fkey(full_name, phone_number)`
    )
    .eq("is_active", true);

  if (error) {
    console.error("[weekly-report] client fetch error:", error.message);
    return summary;
  }

  if (!links || links.length === 0) return summary;

  const ambiguousClientIds = getAmbiguousWeeklyReportClientIds(links as unknown as ClientLink[]);

  for (const raw of links as unknown as ClientLink[]) {
    const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
    const trainerId = raw.trainer_id;
    const clientId = raw.client_id;
    const clientName = String(profile?.full_name ?? "there");
    summary.evaluated++;

    try {
      if (ambiguousClientIds.has(clientId)) {
        summary.errors++;
        console.error(
          `[weekly-report] skipped client ${clientId} because multiple active trainer links exist`,
        );
        continue;
      }

      // 1. Aggregate the week's logs
      const { data: logs } = await db
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g, verification_status, review_state, logged_at")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .gte("logged_at", weekStartIso);

      const foodLogs = filterReportableFoodLogs((logs ?? []) as FoodLogRow[]);
      if (foodLogs.length === 0) {
        summary.skippedNoData++;
        continue; // no activity this week — nothing to report
      }

      const agg = aggregate(foodLogs);

      // 2. Gemini narrative (cascade + hard fallback)
      const narrative = await generateNarrative(clientName, agg);

      // 3. Build PDF
      const pdf = buildReportLines(clientName, weekStartDate, weekEndDate, agg, narrative);
      const pdfBuffer = buildSimplePdf(pdf);
      summary.generated++;

      // 4. Upload to storage
      const storagePath = `${trainerId}/${clientId}/${weekStartDate}.pdf`;
      const { error: uploadError } = await db.storage
        .from(REPORTS_BUCKET)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[weekly-report] upload failed for ${clientId}:`, uploadError.message);
        summary.errors++;
        continue;
      }

      // 5. Record audit row (idempotent per client+week via upsert-like delete+insert)
      await db
        .from("weekly_reports")
        .delete()
        .eq("client_id", clientId)
        .eq("report_date", weekStartDate);

      await db.from("weekly_reports").insert({
        client_id: clientId,
        report_date: weekStartDate,
        summary: narrative.slice(0, 4000),
        pdf_storage_url: storagePath,
      });

      // 6. Deliver via WhatsApp document message (signed URL for Meta to fetch)
      if (profile?.phone_number) {
        const { data: signed } = await db.storage
          .from(REPORTS_BUCKET)
          .createSignedUrl(storagePath, 3600);

        if (signed?.signedUrl) {
          try {
            await sendDocumentMessage(
              trainerId,
              String(profile.phone_number),
              signed.signedUrl,
              `Fortress-Weekly-${weekStartDate}.pdf`,
              `Your weekly performance report (${weekStartDate} to ${weekEndDate}) 📊`
            );
            summary.sent++;
          } catch (err) {
            summary.errors++;
            console.error(
              `[weekly-report] document send failed for ${clientId}:`,
              (err as Error).message
            );
          }
        }
      }
    } catch (err) {
      summary.errors++;
      console.error(`[weekly-report] unhandled error for ${clientId}:`, (err as Error).message);
    }
  }

  console.log(
    `[weekly-report] done — evaluated=${summary.evaluated} generated=${summary.generated} ` +
      `sent=${summary.sent} skipped=${summary.skippedNoData} errors=${summary.errors}`
  );
  return summary;
}
