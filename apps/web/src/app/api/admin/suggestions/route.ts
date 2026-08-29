import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";

// ?status=pending|approved_global|restricted|rejected — defaults to pending,
// the queue admin actually needs to work through day to day.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const { data, error } = await supabase
    .from("categorization_suggestions")
    .select("*")
    .eq("status", status)
    .order("correction_count", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suggestions: data });
}
