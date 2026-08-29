import { supabase } from "../supabase";
import { getConfig } from "../appConfig";

const USER_DERIVED_PRIORITY = 10;

// Without this guard, a user correcting a handful of unrelated
// "transfer"-only transactions to the same category would create an overly
// broad rule that misfires on every future transfer.
const GENERIC_SINGLE_WORDS = new Set(["transfer", "payment", "debit", "credit", "purchase", "transaction"]);

export function isTooGenericForPromotion(normalizedDesc: string): boolean {
  const tokens = normalizedDesc.split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.length === 1 && GENERIC_SINGLE_WORDS.has(tokens[0])) return true;
  return false;
}

/** AR-04: independent of per-user rule promotion below, checks whether this
 * exact (description, category) pair has now been corrected at least
 * GLOBAL_SUGGESTION_THRESHOLD times in aggregate *across all users*, and if
 * so, records it as a pending suggestion for admin review. This never
 * writes to categorization_rules directly and has zero effect on live
 * categorization — only an explicit admin approval (via the admin API) can
 * do that. Skipped entirely if a global rule already covers the pattern, or
 * if a suggestion for it already exists and isn't still pending (approved/
 * restricted suggestions don't need re-flagging; a rejected one stays
 * rejected until an admin explicitly clears it). */
async function maybeCreateGlobalSuggestion(normalizedDesc: string, correctedCategoryId: string): Promise<void> {
  const { data: existingGlobalRule } = await supabase
    .from("categorization_rules")
    .select("id")
    .is("user_id", null)
    .eq("keyword", normalizedDesc)
    .maybeSingle();
  if (existingGlobalRule) return;

  const { data: existingSuggestion } = await supabase
    .from("categorization_suggestions")
    .select("status")
    .eq("normalized_description", normalizedDesc)
    .maybeSingle();
  if (existingSuggestion && existingSuggestion.status !== "pending") return;

  const [threshold, aggregationMode] = await Promise.all([
    getConfig<number>("suggestion_correction_threshold"),
    getConfig<"cross_user" | "per_user">("suggestion_aggregation_mode"),
  ]);

  const { data: correctionRows } = await supabase
    .from("transaction_corrections")
    .select("user_id")
    .eq("normalized_description", normalizedDesc)
    .eq("corrected_category_id", correctedCategoryId);
  const rows = correctionRows ?? [];
  const contributingUserIds = [...new Set(rows.map((r) => r.user_id))];

  // cross_user: every correction anywhere counts toward one shared total.
  // per_user: the threshold must be met by a single user's own repeated
  // corrections — three different users each correcting it once would not
  // qualify, since that's one person's habit observed three times over,
  // not three independent confirmations of a universal pattern.
  const countForThreshold =
    aggregationMode === "per_user"
      ? Math.max(0, ...Object.values(rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.user_id]: (acc[r.user_id] ?? 0) + 1 }), {})))
      : rows.length;
  if (countForThreshold < threshold) return;

  const { data: sampleTxs } = await supabase
    .from("transactions")
    .select("raw_description")
    .eq("normalized_description", normalizedDesc)
    .eq("category_id", correctedCategoryId)
    .limit(5);
  const sampleDescriptions = [...new Set((sampleTxs ?? []).map((t) => t.raw_description).filter((d): d is string => !!d))];

  await supabase.from("categorization_suggestions").upsert(
    {
      normalized_description: normalizedDesc,
      proposed_category_id: correctedCategoryId,
      correction_count: rows.length,
      sample_descriptions: sampleDescriptions,
      contributing_user_ids: contributingUserIds,
      status: "pending",
    },
    { onConflict: "normalized_description" },
  );
}

/** Logs the correction, applies it to the transaction immediately, and — once
 * the same (user, normalized description, category) triple has been
 * corrected 3+ times — promotes it to a user-scoped rule. Returns whether a
 * rule now exists for this pattern (either just-created or already-learned),
 * so the caller can tell the user their correction has been auto-applied. */
export async function recordCorrection(
  userId: string,
  transactionId: string,
  normalizedDesc: string,
  correctedCategoryId: string,
): Promise<{ ruleLearned: boolean }> {
  await supabase.from("transaction_corrections").insert({
    user_id: userId,
    transaction_id: transactionId,
    normalized_description: normalizedDesc,
    corrected_category_id: correctedCategoryId,
  });

  await supabase
    .from("transactions")
    .update({ category_id: correctedCategoryId, category_source: "user-corrected" })
    .eq("id", transactionId);

  if (isTooGenericForPromotion(normalizedDesc)) return { ruleLearned: false };

  await maybeCreateGlobalSuggestion(normalizedDesc, correctedCategoryId);

  const [{ count }, promotionThreshold] = await Promise.all([
    supabase
      .from("transaction_corrections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("normalized_description", normalizedDesc)
      .eq("corrected_category_id", correctedCategoryId),
    getConfig<number>("personal_rule_correction_threshold"),
  ]);

  if ((count ?? 0) < promotionThreshold) return { ruleLearned: false };

  // A rule for this exact pattern may already exist for this user, possibly
  // pointing at a different category if the user's labelling has drifted —
  // update it in place rather than creating a duplicate.
  const { data: existingRule } = await supabase
    .from("categorization_rules")
    .select("id, category_id")
    .eq("user_id", userId)
    .eq("keyword", normalizedDesc)
    .maybeSingle();

  if (existingRule) {
    if (existingRule.category_id !== correctedCategoryId) {
      await supabase
        .from("categorization_rules")
        .update({ category_id: correctedCategoryId })
        .eq("id", existingRule.id);
    }
    return { ruleLearned: true };
  }

  // Upsert on the (user_id, keyword) unique constraint guards against a race
  // between two concurrent corrections both hitting the promotion threshold.
  await supabase.from("categorization_rules").upsert(
    {
      user_id: userId,
      category_id: correctedCategoryId,
      keyword: normalizedDesc,
      priority: USER_DERIVED_PRIORITY,
      source: "user_derived",
    },
    { onConflict: "user_id,keyword" },
  );

  return { ruleLearned: true };
}
