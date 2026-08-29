import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Writes a personal rule (Tab 3) for each target user instead of a global
// one — for a pattern that's real but reflects one user's own habit rather
// than a universal merchant pattern (AR-04). Defaults to exactly the users
// whose corrections produced the suggestion; an explicit `userIds` body
// narrows or widens that set if admin knows better.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: suggestion } = await supabase.from("categorization_suggestions").select("*").eq("id", id).maybeSingle();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: `Suggestion is already ${suggestion.status}` }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { userIds?: string[] };
  const targetUserIds = body.userIds?.length ? body.userIds : suggestion.contributing_user_ids;
  if (!targetUserIds || targetUserIds.length === 0) {
    return NextResponse.json({ error: "No target users to restrict this rule to" }, { status: 400 });
  }

  const { data: rules, error: ruleError } = await supabase
    .from("categorization_rules")
    .upsert(
      targetUserIds.map((userId: string) => ({
        user_id: userId,
        category_id: suggestion.proposed_category_id,
        keyword: suggestion.normalized_description,
        priority: 10,
        source: "restricted_suggestion",
        status: "active",
      })),
      { onConflict: "user_id,keyword" },
    )
    .select();
  if (ruleError) return NextResponse.json({ error: ruleError.message }, { status: 500 });

  const { data: updated, error: updateError } = await supabase
    .from("categorization_suggestions")
    .update({ status: "restricted", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await logAdminAction({
    actionType: "restrict",
    targetEntity: "suggestion",
    targetId: id,
    beforeState: suggestion,
    afterState: { suggestion: updated, createdRules: rules },
  });
  return NextResponse.json({ suggestion: updated, rules });
}
