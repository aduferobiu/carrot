import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Promotes a pending suggestion straight into the live global rule set
// (Tab 1), at the *end* of priority order by default — AR-04 is explicit
// that a freshly approved rule must never silently shadow a more specific
// existing one just by being newer.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: suggestion } = await supabase.from("categorization_suggestions").select("*").eq("id", id).maybeSingle();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: `Suggestion is already ${suggestion.status}` }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from("categorization_rules")
    .select("priority")
    .is("user_id", null)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  const endPriority = (maxRow?.priority ?? 0) + 10;

  const { data: rule, error: ruleError } = await supabase
    .from("categorization_rules")
    .insert({
      category_id: suggestion.proposed_category_id,
      keyword: suggestion.normalized_description,
      priority: endPriority,
      source: "seed",
      status: "active",
      user_id: null,
    })
    .select()
    .single();
  if (ruleError || !rule) return NextResponse.json({ error: ruleError?.message ?? "Failed to create rule" }, { status: 500 });

  const { data: updated, error: updateError } = await supabase
    .from("categorization_suggestions")
    .update({ status: "approved_global", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await logAdminAction({
    actionType: "approve_global",
    targetEntity: "suggestion",
    targetId: id,
    beforeState: suggestion,
    afterState: { suggestion: updated, createdRule: rule },
  });
  return NextResponse.json({ suggestion: updated, rule });
}
