import { Rule } from "./matcher";

// Seed rules are the same for every user and change rarely — cache them in
// process memory instead of fetching on every batch.
let cache: Rule[] | null = null;
let cacheExpiry = 0;
const TTL_MS = 5 * 60 * 1000;

export async function getSeedRulesCached(fetchSeedRules: () => Promise<Rule[]>): Promise<Rule[]> {
  if (cache && Date.now() < cacheExpiry) return cache;
  cache = await fetchSeedRules();
  cacheExpiry = Date.now() + TTL_MS;
  return cache;
}
