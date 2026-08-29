import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Tab 1 — the global (user_id null) rule set only; Tab 3's personal rules
// have their own list endpoint (/api/admin/personal-rules).
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data: rules, error } = await supabase
    .from("categorization_rules")
    .select("*")
    .is("user_id", null)
    .order("priority")
    .order("keyword");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // One count query per rule, run in parallel — Tab 1's rule set is a
  // shared, hand-curated list (not per-user), so this stays small.
  const withCounts = await Promise.all(
    (rules ?? []).map(async (r) => {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("matched_rule_id", r.id);
      return { ...r, match_count: count ?? 0 };
    }),
  );

  return NextResponse.json({ rules: withCounts });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as { category_id?: string; keyword?: string; priority?: number };
  if (!body.category_id || !body.keyword?.trim()) {
    return NextResponse.json({ error: "category_id and keyword are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("categorization_rules")
    .insert({
      category_id: body.category_id,
      keyword: body.keyword.trim().toLowerCase(),
      priority: body.priority ?? 100,
      source: "seed",
      status: "active",
      user_id: null,
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create rule" }, { status: 500 });

  await logAdminAction({ actionType: "create", targetEntity: "rule", targetId: data.id, afterState: data });
  return NextResponse.json({ rule: data });
}
