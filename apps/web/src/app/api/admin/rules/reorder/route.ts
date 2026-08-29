import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Body: the full ordered list of global rule ids, top (highest precedence)
// first. Re-numbers priority 10, 20, 30… so there's always headroom to slot
// a new rule between two existing ones later without a full re-reorder.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { orderedIds } = (await req.json()) as { orderedIds?: string[] };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds must be a non-empty array" }, { status: 400 });
  }

  const { data: before } = await supabase.from("categorization_rules").select("id, priority").is("user_id", null);

  const updates = orderedIds.map((id, i) =>
    supabase
      .from("categorization_rules")
      .update({ priority: (i + 1) * 10 })
      .eq("id", id)
      .is("user_id", null),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  await logAdminAction({
    actionType: "reorder",
    targetEntity: "rule",
    beforeState: before,
    afterState: orderedIds.map((id, i) => ({ id, priority: (i + 1) * 10 })),
  });
  return NextResponse.json({ ok: true });
}
