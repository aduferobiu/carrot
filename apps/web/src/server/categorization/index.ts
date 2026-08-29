import { supabase } from "../supabase";
import { normalize } from "./normalize";
import { matchCategoryOrdered, sortBySpecificity, Rule } from "./matcher";
import { getSeedRulesCached } from "./seedCache";
import { recordCorrection as recordCorrectionImpl } from "./ruleLearning";

export type CategorizationResult = {
  transactionId: string;
  categoryId: string;
  normalizedDescription: string;
  categorySource: "rule-matched" | "fallback";
  matchedRuleId: string | null;
};

let othersCategoryIdCache: { id: string; expiry: number } | null = null;
const OTHERS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getOthersCategoryId(): Promise<string> {
  if (othersCategoryIdCache && Date.now() < othersCategoryIdCache.expiry) {
    return othersCategoryIdCache.id;
  }
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Others")
    .not("parent_id", "is", null)
    .maybeSingle();
  if (error || !data) {
    throw new Error("'Others' fallback category not found — has the categorization taxonomy been seeded?");
  }
  othersCategoryIdCache = { id: data.id, expiry: Date.now() + OTHERS_CACHE_TTL_MS };
  return data.id;
}

// Only active rules pointing at an active category are live: an admin
// disabling either one (AR-03) must take effect for matching immediately —
// well, immediately for user rules, and within getSeedRulesCached's 5-minute
// TTL for seed rules, an existing tradeoff this doesn't change.
const ACTIVE_RULE_SELECT = "id, category_id, keyword, priority, categories!inner(is_active)";

async function getUserRules(userId: string): Promise<Rule[]> {
  // user_id is a uuid column — an empty string isn't a valid uuid literal,
  // so Postgres rejects the query outright rather than just matching zero
  // rows. AR-08's test utility deliberately calls this with "" to mean "no
  // personal rules to consider," so that has to short-circuit here instead
  // of ever reaching the query.
  if (!userId) return [];
  const { data, error } = await supabase
    .from("categorization_rules")
    .select(ACTIVE_RULE_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("categories.is_active", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getSeedRules(): Promise<Rule[]> {
  const { data, error } = await supabase
    .from("categorization_rules")
    .select(ACTIVE_RULE_SELECT)
    .is("user_id", null)
    .eq("status", "active")
    .eq("categories.is_active", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Pure categorization — loads rule sets once, matches every transaction in
 * memory, and returns the results. Callers are responsible for persisting
 * them (and, if the transaction row already exists, for logging fallbacks
 * via `logFallbacks`) since how that's done differs between a fresh Mono
 * sync — where rows don't exist yet — and a correction or backfill, where
 * they do. */
export async function categorizeBatch(
  transactions: { id: string; description: string | null }[],
  userId: string,
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) return [];

  const [userRules, seedRules, othersCategoryId] = await Promise.all([
    getUserRules(userId),
    getSeedRulesCached(getSeedRules),
    getOthersCategoryId(),
  ]);

  // User-derived rules always take precedence over global seed rules,
  // regardless of keyword length — a user's own correction should win.
  const orderedRules = [...sortBySpecificity(userRules), ...sortBySpecificity(seedRules)];

  return transactions.map((t) => {
    const normalizedDescription = normalize(t.description);
    const match = matchCategoryOrdered(normalizedDescription, orderedRules, othersCategoryId);
    return {
      transactionId: t.id,
      categoryId: match.categoryId,
      normalizedDescription,
      categorySource: match.ruleId ? "rule-matched" : "fallback",
      matchedRuleId: match.ruleId,
    };
  });
}

/** Logs fallback ("Others") categorizations for transaction rows that are
 * already persisted (uncategorized_log.transaction_id has a hard FK). */
export async function logFallbacks(results: CategorizationResult[]): Promise<void> {
  const fallbacks = results.filter((r) => r.categorySource === "fallback");
  if (fallbacks.length === 0) return;
  await supabase.from("uncategorized_log").insert(
    fallbacks.map((f) => ({
      transaction_id: f.transactionId,
      normalized_description: f.normalizedDescription,
    })),
  );
}

export async function recordCorrection(
  userId: string,
  transactionId: string,
  rawDescription: string | null,
  correctedCategoryId: string,
): Promise<{ ruleLearned: boolean }> {
  const normalizedDescription = normalize(rawDescription);
  return recordCorrectionImpl(userId, transactionId, normalizedDescription, correctedCategoryId);
}
