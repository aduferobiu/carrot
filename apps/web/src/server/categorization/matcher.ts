export type Rule = { id: string; category_id: string; keyword: string; priority: number };

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lower priority numbers are tried first — this is what admin's Tab 1 rule
// reordering (AR-03) actually edits, so a newly added narrow rule can be
// moved above a broader existing one. Within equal priority, longer
// keywords are more specific and go first; Array.prototype.sort is stable,
// so further ties preserve insertion order — seed data order matters there.
export function sortBySpecificity(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => a.priority - b.priority || b.keyword.length - a.keyword.length);
}

export type MatchResult = { categoryId: string; ruleId: string | null };

// Takes an already-ordered rule list (user rules first, then seed rules, each
// specificity-sorted) so sorting happens once per batch, not once per
// transaction.
export function matchCategoryOrdered(
  normalizedDesc: string,
  orderedRules: Rule[],
  othersCategoryId: string,
): MatchResult {
  for (const rule of orderedRules) {
    const pattern = new RegExp(`\\b${escapeRegex(rule.keyword)}\\b`, "i");
    if (pattern.test(normalizedDesc)) {
      return { categoryId: rule.category_id, ruleId: rule.id };
    }
  }
  return { categoryId: othersCategoryId, ruleId: null };
}
