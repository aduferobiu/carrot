import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";
import { categorizeBatch } from "@/server/categorization";

// AR-08: runs a sample description through the exact same categorizeBatch()
// the live sync/correction paths call — not a parallel re-implementation —
// so the result is guaranteed to match what the engine would actually do.
// Passing "" as the userId when none is supplied is deliberate: getUserRules
// filters on user_id, and no real account ever has an empty-string id, so
// this naturally yields zero personal-rule matches without a special case.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { description, beneficiaryIdentifier, userId } = (await req.json()) as {
    description?: string;
    beneficiaryIdentifier?: string;
    userId?: string;
  };
  if (!description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const rawText = beneficiaryIdentifier?.trim() ? `${description.trim()} ${beneficiaryIdentifier.trim()}` : description.trim();

  const [result] = await categorizeBatch([{ id: "admin-test", description: rawText }], userId?.trim() || "");

  let rule: { keyword: string; priority: number; source: string; scope: string } | null = null;
  if (result.matchedRuleId) {
    const { data } = await supabase
      .from("categorization_rules")
      .select("keyword, priority, source, user_id")
      .eq("id", result.matchedRuleId)
      .maybeSingle();
    if (data) rule = { keyword: data.keyword, priority: data.priority, source: data.source, scope: data.user_id ? "personal (this user)" : "global" };
  }

  const { data: category } = await supabase.from("categories").select("name").eq("id", result.categoryId).maybeSingle();

  return NextResponse.json({
    rawTextTested: rawText,
    normalizedDescription: result.normalizedDescription,
    matched: !!result.matchedRuleId,
    category: category?.name ?? null,
    categorySource: result.categorySource,
    rule,
  });
}
