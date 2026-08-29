// One-time: re-categorizes only transactions still sitting at
// category_source='fallback' against the current rule set. Unlike
// backfillCategorize.ts (which touches every transaction, including ones a
// user has manually corrected), this only ever rewrites rows nobody has
// touched — safe to run any time the taxonomy gains new keywords.
//
// Run from apps/web with: npx tsx --env-file=.env.local src/server/categorization/scripts/backfillFallbackOnly.ts
import { supabase } from "../../supabase";
import { categorizeBatch, logFallbacks } from "../index";

// Supabase's REST API caps a single response at 1000 rows by default, so a
// dataset with more fallback rows than that needs paging through explicitly
// — see the matching fetchAllRows helper on the client side.
async function fetchAllFallback() {
  type Row = { id: string; user_id: string; description: string | null; raw_description: string | null };
  const all: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, user_id, description, raw_description")
      .eq("category_source", "fallback")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const transactions = await fetchAllFallback();
  if (transactions.length === 0) {
    console.log("No fallback transactions to re-categorize.");
    return;
  }

  const byUser = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const list = byUser.get(t.user_id) ?? [];
    list.push(t);
    byUser.set(t.user_id, list);
  }

  let updated = 0;
  let reclassified = 0;
  let stillFallback = 0;
  for (const [userId, userTxs] of byUser) {
    const results = await categorizeBatch(
      userTxs.map((t) => ({ id: t.id, description: t.description ?? t.raw_description })),
      userId,
    );

    await Promise.all(
      results.map((r) =>
        supabase
          .from("transactions")
          .update({
            category_id: r.categoryId,
            normalized_description: r.normalizedDescription,
            category_source: r.categorySource,
            matched_rule_id: r.matchedRuleId,
          })
          .eq("id", r.transactionId),
      ),
    );
    await logFallbacks(results);

    updated += results.length;
    reclassified += results.filter((r) => r.categorySource === "rule-matched").length;
    stillFallback += results.filter((r) => r.categorySource === "fallback").length;
  }

  console.log({ checked: updated, reclassified, stillFallback });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
