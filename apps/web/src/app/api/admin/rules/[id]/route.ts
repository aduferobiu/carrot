import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const body = (await req.json()) as {
    category_id?: string;
    keyword?: string;
    priority?: number;
    status?: "active" | "disabled";
  };
  const patch: Record<string, unknown> = {};
  if (body.category_id) patch.category_id = body.category_id;
  if (typeof body.keyword === "string" && body.keyword.trim()) patch.keyword = body.keyword.trim().toLowerCase();
  if (typeof body.priority === "number") patch.priority = body.priority;
  if (body.status === "active" || body.status === "disabled") patch.status = body.status;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: before } = await supabase.from("categorization_rules").select("*").eq("id", id).is("user_id", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "Global rule not found" }, { status: 404 });

  const { data, error } = await supabase.from("categorization_rules").update(patch).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update rule" }, { status: 500 });

  await logAdminAction({ actionType: "update", targetEntity: "rule", targetId: id, beforeState: before, afterState: data });
  return NextResponse.json({ rule: data });
}

// A real delete (unlike categories) — matched_rule_id is `on delete set
// null`, so any transaction that had matched this rule just loses that
// provenance pointer, keeping its already-assigned category_id untouched.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: before } = await supabase.from("categorization_rules").select("*").eq("id", id).is("user_id", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "Global rule not found" }, { status: 404 });

  const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({ actionType: "delete", targetEntity: "rule", targetId: id, beforeState: before });
  return NextResponse.json({ ok: true });
}
