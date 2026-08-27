import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { supabase } from "@/server/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;
  const { id } = await params;

  const { status } = (await req.json()) as { status?: "dismissed" | "active" };
  if (status !== "dismissed" && status !== "active") {
    return NextResponse.json({ error: "status must be 'dismissed' or 'active'" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  if (existing.user_id !== userId) {
    return NextResponse.json({ error: "This subscription doesn't belong to you" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update subscription" }, { status: 500 });
  }
  return NextResponse.json({ subscription: data });
}
