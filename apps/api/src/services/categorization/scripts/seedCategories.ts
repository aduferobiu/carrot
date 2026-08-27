// One-time / idempotent: reads taxonomy.json and populates `categories`
// (parents + leaves) and `categorization_rules` (source='seed'), then
// remaps any existing budget onto the matching new leaf by name, then
// deletes whatever's left of the old flat taxonomy.
//
// Run with: npx tsx src/services/categorization/scripts/seedCategories.ts
import "dotenv/config";
import { supabase } from "../../../lib/supabase";
import taxonomyJson from "../seedData/taxonomy.json";

type SeedSubcategory = { name: string; keywords: string[] };
type SeedCategory = {
  name: string;
  kind: "income" | "expense";
  icon: string;
  color: string;
  subcategories: SeedSubcategory[];
};

const taxonomy = taxonomyJson as unknown as { fallback_category: string; categories: SeedCategory[] };

const NEW_PARENT_NAMES = new Set(taxonomy.categories.map((c) => c.name));

function validateNoKeywordCollisions(t: { categories: SeedCategory[] }) {
  const seen = new Map<string, string>();
  for (const category of t.categories) {
    for (const sub of category.subcategories) {
      for (const keyword of sub.keywords) {
        if (seen.has(keyword)) {
          throw new Error(`Keyword collision: "${keyword}" appears in both "${seen.get(keyword)}" and "${sub.name}"`);
        }
        seen.set(keyword, sub.name);
      }
    }
  }
}

async function main() {
  validateNoKeywordCollisions(taxonomy);

  const { data: existingCats, error: catsErr } = await supabase.from("categories").select("*");
  if (catsErr) throw new Error(catsErr.message);
  const categories = existingCats ?? [];

  const { data: existingBudgets, error: budgetsErr } = await supabase.from("budgets").select("*");
  if (budgetsErr) throw new Error(budgetsErr.message);
  // Snapshot each budget's current category name before anything moves —
  // this is what drives the remap onto the new leaves below.
  const budgetSnapshots = (existingBudgets ?? []).map((b) => ({
    budget: b,
    oldCategoryName: categories.find((c) => c.id === b.category_id)?.name ?? null,
  }));

  const parentIdByName = new Map<string, string>();
  let parentsCreated = 0;
  for (const cat of taxonomy.categories) {
    const existing = categories.find((c) => c.name === cat.name && c.parent_id === null);
    if (existing) {
      parentIdByName.set(cat.name, existing.id);
      continue;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: cat.name, kind: cat.kind, icon: cat.icon, color: cat.color, is_default: true, user_id: null })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? `Failed to insert parent category "${cat.name}"`);
    parentIdByName.set(cat.name, data.id);
    categories.push(data);
    parentsCreated++;
  }

  const leafIdByName = new Map<string, string>();
  let leavesCreated = 0;
  let rulesCreated = 0;
  for (const cat of taxonomy.categories) {
    const parentId = parentIdByName.get(cat.name)!;
    for (const sub of cat.subcategories) {
      let leafId = categories.find((c) => c.name === sub.name && c.parent_id === parentId)?.id;
      if (!leafId) {
        const { data, error } = await supabase
          .from("categories")
          .insert({
            name: sub.name,
            kind: cat.kind,
            icon: cat.icon,
            color: cat.color,
            is_default: true,
            user_id: null,
            parent_id: parentId,
          })
          .select()
          .single();
        if (error || !data) throw new Error(error?.message ?? `Failed to insert leaf category "${sub.name}"`);
        leafId = data.id;
        categories.push(data);
        leavesCreated++;
      }
      leafIdByName.set(sub.name, leafId);

      for (const keyword of sub.keywords) {
        const { data: existingRule } = await supabase
          .from("categorization_rules")
          .select("id")
          .eq("keyword", keyword)
          .is("user_id", null)
          .maybeSingle();
        if (existingRule) continue;
        const { error } = await supabase
          .from("categorization_rules")
          .insert({ category_id: leafId, keyword, priority: 100, source: "seed", user_id: null });
        if (error) throw new Error(`Failed to insert seed rule "${keyword}": ${error.message}`);
        rulesCreated++;
      }
    }
  }

  let budgetsRemapped = 0;
  for (const { budget, oldCategoryName } of budgetSnapshots) {
    if (!oldCategoryName) continue;
    const newLeafId = leafIdByName.get(oldCategoryName);
    if (!newLeafId) {
      console.warn(`No new leaf matches old category "${oldCategoryName}" — budget ${budget.id} will lose its category if the old row is deleted.`);
      continue;
    }
    if (newLeafId === budget.category_id) continue;
    const { error } = await supabase.from("budgets").update({ category_id: newLeafId }).eq("id", budget.id);
    if (error) throw new Error(`Failed to remap budget ${budget.id}: ${error.message}`);
    budgetsRemapped++;
  }

  const orphanedOldCategories = categories.filter(
    (c) => c.parent_id === null && c.is_default && !NEW_PARENT_NAMES.has(c.name),
  );
  let categoriesDeleted = 0;
  for (const c of orphanedOldCategories) {
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) throw new Error(`Failed to delete old category "${c.name}": ${error.message}`);
    categoriesDeleted++;
  }

  console.log({
    parentsCreated,
    leavesCreated,
    rulesCreated,
    budgetsRemapped,
    oldCategoriesDeleted: categoriesDeleted,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
