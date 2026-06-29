import { createClient } from "@supabase/supabase-js";
import { runAI } from "@/ai/aiGateway";
import { geminiModels } from "@/mastra/config";
import { sendDocumentMessage } from "@/lib/whatsapp/send";
import { buildSimplePdf, wrapText, type PdfLine } from "@/lib/pdf/weekly-report";

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
  client_id: string;
  profiles: { full_name: string | null; phone_number: string | null } | null;
}

interface FoodLogRow {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  verification_status: string;
  logged_at: string;
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
      `client_id, profiles!trainer_clients_client_id_fkey(full_name, phone_number)`
    )
    .eq("is_active", true);

  if (error) {
    console.error("[weekly-report] client fetch error:", error.message);
    return summary;
  }

  if (!links || links.length === 0) return summary;

  for (const raw of links as unknown as ClientLink[]) {
    const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
    const clientId = raw.client_id;
    const clientName = String(profile?.full_name ?? "there");
    summary.evaluated++;

    try {
      // 1. Aggregate the week's logs
      const { data: logs } = await db
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g, verification_status, logged_at")
        .eq("client_id", clientId)
        .gte("logged_at", weekStartIso);

      const foodLogs = (logs ?? []) as FoodLogRow[];
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
      const storagePath = `${clientId}/${weekStartDate}.pdf`;
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
