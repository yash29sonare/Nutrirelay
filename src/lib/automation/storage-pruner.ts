import { createClient } from "@supabase/supabase-js";

// Rows older than this are eligible for pruning
const RETENTION_DAYS = 30;
const BATCH_SIZE = 500;
const MAX_ITERATIONS = 10;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function retentionCutoff(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - RETENTION_DAYS);
  return d.toISOString();
}

interface PruneResult {
  table: string;
  rowsDeleted: number;
  iterations: number;
}

async function pruneTable(
  db: ReturnType<typeof getDb>,
  table: string,
  timestampColumn: string,
  cutoff: string,
  extraFilter?: { column: string; value: string }
): Promise<PruneResult> {
  let totalDeleted = 0;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    // Fetch a batch of IDs to delete — avoids broad DELETE scans with row locks
    let query = db
      .from(table)
      .select("id")
      .lt(timestampColumn, cutoff)
      .limit(BATCH_SIZE);

    if (extraFilter) {
      query = query.eq(extraFilter.column, extraFilter.value);
    }

    const { data: rows, error: fetchError } = await query;

    if (fetchError) {
      console.error(`[storage-pruner] fetch error on ${table}:`, fetchError.message);
      break;
    }

    if (!rows || rows.length === 0) break;

    const ids = (rows as { id: string }[]).map((r) => r.id);

    const { error: deleteError } = await db.from(table).delete().in("id", ids);

    if (deleteError) {
      console.error(`[storage-pruner] delete error on ${table}:`, deleteError.message);
      break;
    }

    totalDeleted += ids.length;
    iterations++;

    // If we got fewer rows than the batch cap, we've drained the eligible set
    if (ids.length < BATCH_SIZE) break;
  }

  return { table, rowsDeleted: totalDeleted, iterations };
}

export async function executeStoragePrune(): Promise<void> {
  const db = getDb();
  const cutoff = retentionCutoff();

  console.log(`[storage-pruner] pruning rows older than ${cutoff}`);

  const results = await Promise.all([
    // Processed webhook log entries (dedup ledger — safe to prune old entries)
    pruneTable(db, "incoming_webhook_logs", "received_at", cutoff, {
      column: "status",
      value: "processed",
    }),

    // Skipped webhook log entries
    pruneTable(db, "incoming_webhook_logs", "received_at", cutoff, {
      column: "status",
      value: "skipped",
    }),

    // Verified food logs older than retention window
    pruneTable(db, "food_logs", "created_at", cutoff, {
      column: "verification_status",
      value: "VERIFIED",
    }),
  ]);

  for (const r of results) {
    console.log(
      `[storage-pruner] ${r.table}: deleted ${r.rowsDeleted} rows in ${r.iterations} iteration(s)`
    );
  }
}
