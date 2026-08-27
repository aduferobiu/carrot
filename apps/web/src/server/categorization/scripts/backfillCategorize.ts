// One-time: re-categorizes every existing transaction against the new
// taxonomy (they were synced before the categorization engine existed, so
// they're all sitting at category_id null / "fallback").
//
// Run from apps/web with: npx tsx --env-file=.env.local src/server/categorization/scripts/backfillCategorize.ts
import { supabase } from "../../supabase";
import { categorizeBatch, logFallbacks } from "../index";

async function main() {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, user_id, description, raw_description");
  if (error) throw new Error(error.message);
  if (!transactions || transactions.length === 0) {
    console.log("No transactions to categorize.");
    return;
  }

  const byUser = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const list = byUser.get(t.user_id) ?? [];
    list.push(t);
    byUser.set(t.user_id, list);
  }

  let updated = 0;
  let fallbackCount = 0;
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
    fallbackCount += results.filter((r) => r.categorySource === "fallback").length;
  }

  console.log({ transactionsUpdated: updated, fallbackRate: `${Math.round((fallbackCount / updated) * 100)}%` });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
