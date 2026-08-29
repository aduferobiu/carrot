import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// The AR-05 safety valve for a rule the engine mis-learned (e.g. a
// beneficiary matched to the wrong category).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { status } = (await req.json()) as { status?: "active" | "disabled" };
  if (status !== "active" && status !== "disabled") {
    return NextResponse.json({ error: "status must be 'active' or 'disabled'" }, { status: 400 });
  }

  const { data: before } = await supabase.from("categorization_rules").select("*").eq("id", id).not("user_id", "is", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "Personal rule not found" }, { status: 404 });

  const { data, error } = await supabase.from("categorization_rules").update({ status }).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update rule" }, { status: 500 });

  await logAdminAction({ actionType: "update", targetEntity: "personal_rule", targetId: id, beforeState: before, afterState: data });
  return NextResponse.json({ rule: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: before } = await supabase.from("categorization_rules").select("*").eq("id", id).not("user_id", "is", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "Personal rule not found" }, { status: 404 });

  const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({ actionType: "delete", targetEntity: "personal_rule", targetId: id, beforeState: before });
  return NextResponse.json({ ok: true });
}
