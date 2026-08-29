import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabase.from("categories").select("*").order("parent_id").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as { name?: string; kind?: "income" | "expense"; icon?: string; color?: string; parent_id?: string | null };
  if (!body.name || !body.kind || !body.icon || !body.color) {
    return NextResponse.json({ error: "name, kind, icon, and color are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: body.name,
      kind: body.kind,
      icon: body.icon,
      color: body.color,
      parent_id: body.parent_id ?? null,
      is_default: true,
      user_id: null,
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create category" }, { status: 500 });

  await logAdminAction({ actionType: "create", targetEntity: "category", targetId: data.id, afterState: data });
  return NextResponse.json({ category: data });
}
