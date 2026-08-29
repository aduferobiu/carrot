import { randomUUID } from "crypto";
import { getMonoTransactions, MonoTransaction } from "./mono";
import { supabase } from "./supabase";
import { categorizeBatch } from "./categorization";
import { runDetection } from "./subscriptions";

const UPSERT_CHUNK_SIZE = 400;

// Mono's transactions endpoint expects dd-mm-yyyy, not ISO.
function monoDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** Best-effort: fetches ~6 months of history and upserts it (deduped on
 * mono_transaction_id, so calling this again to "refresh" never duplicates
 * rows). A failure here shouldn't undo an otherwise-successful account link. */
export async function syncTransactions(params: {
  userId: string;
  accountId: string;
  monoAccountId: string;
}): Promise<number> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);

  let monoTxs: MonoTransaction[];
  try {
    monoTxs = await getMonoTransactions(params.monoAccountId, {
      start: monoDate(start),
      end: monoDate(end),
    });
  } catch (err) {
    console.error("[accounts] transaction sync fetch failed:", err);
    return 0;
  }
  if (monoTxs.length === 0) return 0;

  // Ids are pre-generated (rather than left to Postgres' default) so we can
  // categorize before the insert and still know which row each result
  // belongs to.
  const withIds = monoTxs.map((t) => ({ ...t, _id: randomUUID() }));
  const catResults = await categorizeBatch(
    withIds.map((t) => ({ id: t._id, description: t.narration })),
    params.userId,
  );
  const catByTxId = new Map(catResults.map((r) => [r.transactionId, r]));

  const rows = withIds.map((t) => {
    const type = t.type?.toLowerCase() === "credit" ? "income" : "expense";
    const cat = catByTxId.get(t._id)!;
    return {
      id: t._id,
      user_id: params.userId,
      account_id: params.accountId,
      category_id: cat.categoryId,
      type,
      amount: Math.abs(t.amount) / 100,
      description: t.narration,
      raw_description: t.narration,
      normalized_description: cat.normalizedDescription,
      category_source: cat.categorySource,
      matched_rule_id: cat.matchedRuleId,
      occurred_at: new Date(t.date).toISOString(),
      mono_transaction_id: t.id,
    };
  });

  // With ignoreDuplicates, only genuinely-new rows come back from `.select()`
  // — rows skipped as duplicates (already synced in an earlier call) never
  // hit the DB under the id we generated for them here.
  //
  // Upserted in parallel chunks rather than one call: a single request
  // carrying a large account's whole 6-month history (a heavy account can
  // easily be 1000+ rows) risks running long enough to hit a serverless
  // function's execution timeout, which kills the request after the account
  // itself is already linked — leaving it stuck with zero transactions and
  // no visible error. Smaller concurrent chunks finish faster in aggregate
  // and, if one chunk does fail, the rest still land instead of losing
  // everything.
  const chunks: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) chunks.push(rows.slice(i, i + UPSERT_CHUNK_SIZE));

  const chunkResults = await Promise.all(
    chunks.map((c) =>
      supabase
        .from("transactions")
        .upsert(c, { onConflict: "mono_transaction_id", ignoreDuplicates: true, count: "exact" })
        .select("id, category_source, normalized_description"),
    ),
  );

  let totalCount = 0;
  const inserted: { id: string; category_source: string; normalized_description: string }[] = [];
  for (const r of chunkResults) {
    if (r.error) {
      console.error("[accounts] transaction sync upsert chunk failed:", JSON.stringify(r.error));
      continue;
    }
    totalCount += r.count ?? 0;
    inserted.push(...(r.data ?? []));
  }

  const fallbackLogs = inserted
    .filter((r) => r.category_source === "fallback")
    .map((r) => ({ transaction_id: r.id, normalized_description: r.normalized_description }));
  if (fallbackLogs.length > 0) {
    await supabase.from("uncategorized_log").insert(fallbackLogs);
  }

  await runDetection(params.userId);

  return totalCount;
}
