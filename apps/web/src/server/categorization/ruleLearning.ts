import { supabase } from "../supabase";

const PROMOTION_THRESHOLD = 3;
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

  const { count } = await supabase
    .from("transaction_corrections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("normalized_description", normalizedDesc)
    .eq("corrected_category_id", correctedCategoryId);

  if ((count ?? 0) < PROMOTION_THRESHOLD) return { ruleLearned: false };

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
