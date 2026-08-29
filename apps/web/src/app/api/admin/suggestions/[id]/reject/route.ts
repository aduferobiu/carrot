import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: suggestion } = await supabase.from("categorization_suggestions").select("*").eq("id", id).maybeSingle();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: `Suggestion is already ${suggestion.status}` }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("categorization_suggestions")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({ actionType: "reject", targetEntity: "suggestion", targetId: id, beforeState: suggestion, afterState: updated });
  return NextResponse.json({ suggestion: updated });
}
