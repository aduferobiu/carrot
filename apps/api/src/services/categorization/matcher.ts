export type Rule = { id: string; category_id: string; keyword: string };

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longer keywords are more specific and are tried first. Array.prototype.sort
// is stable, so ties (equal length) preserve insertion order — seed data
// order matters for tie-breaks.
export function sortBySpecificity(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => b.keyword.length - a.keyword.length);
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
