import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// "Explicitly clear the rejection" (AR-04): only ever allowed on a rejected
// suggestion. Deleting the row frees its normalized_description for the
// unique constraint, so the next detection pass can create a fresh pending
// suggestion for the same pattern if corrections keep coming in.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: suggestion } = await supabase.from("categorization_suggestions").select("*").eq("id", id).maybeSingle();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  if (suggestion.status !== "rejected") {
    return NextResponse.json({ error: "Only a rejected suggestion's rejection can be cleared" }, { status: 400 });
  }

  const { error } = await supabase.from("categorization_suggestions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({ actionType: "clear_rejection", targetEntity: "suggestion", targetId: id, beforeState: suggestion });
  return NextResponse.json({ ok: true });
}
