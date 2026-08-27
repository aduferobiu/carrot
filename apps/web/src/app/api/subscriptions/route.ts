import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { supabase } from "@/server/supabase";

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("predicted_next_charge_at", { ascending: true, nullsFirst: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ subscriptions: data ?? [] });
}
