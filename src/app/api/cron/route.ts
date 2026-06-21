import { evaluateMealNudges } from "@/lib/automation/meal-nudges";
import { runGhostingAudit } from "@/lib/automation/ghosting-daemon";
import { executeStoragePrune } from "@/lib/automation/storage-pruner";
import { runRenewalEngine } from "@/lib/automation/renewal-engine";
import { generateWeeklyReports } from "@/lib/automation/weekly-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── Auth helper ────────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set");
    return false;
  }

  // Accept Bearer token in Authorization header (standard cron services)
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Accept ?token= query parameter (Vercel Cron fallback)
  const url = new URL(req.url);
  if (url.searchParams.get("token") === secret) return true;

  return false;
}

// ── Shared execution router ────────────────────────────────────────────────────

async function handleCronRequest(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "nudges":
        await evaluateMealNudges();
        return new Response(JSON.stringify({ ok: true, action }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      case "ghosts":
        await runGhostingAudit();
        return new Response(JSON.stringify({ ok: true, action }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      case "prune":
        await executeStoragePrune();
        return new Response(JSON.stringify({ ok: true, action }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      case "renewals": {
        const summary = await runRenewalEngine();
        return new Response(JSON.stringify({ ok: true, action, summary }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      case "reports": {
        const summary = await generateWeeklyReports();
        return new Response(JSON.stringify({ ok: true, action, summary }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({
            error: "Unknown action",
            valid_actions: ["nudges", "ghosts", "prune", "renewals", "reports"],
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error(`[cron] unhandled error for action=${action}:`, (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal error", action }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  return handleCronRequest(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleCronRequest(req);
}
