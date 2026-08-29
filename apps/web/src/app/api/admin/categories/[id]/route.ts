import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Rename and/or toggle is_active only — a hard delete is deliberately not
// exposed here (AR-03): it would orphan any transaction still labelled with
// this category. Disabling removes it from the live matching set (enforced
// in categorization/index.ts's ACTIVE_RULE_SELECT) and from the user-facing
// manual-correction dropdown (CategoryPickerModal filters on is_active).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const body = (await req.json()) as { name?: string; is_active?: boolean };
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: before } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update category" }, { status: 500 });

  await logAdminAction({ actionType: "update", targetEntity: "category", targetId: id, beforeState: before, afterState: data });
  return NextResponse.json({ category: data });
}
