import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";

const PAGE_SIZE = 50;

// Filterable by actor, action type, target entity, and a created_at date
// range (AR-01). This is read-only by design — there is deliberately no
// PATCH/DELETE anywhere in this route family; the audit log must stay a
// trustworthy record even if an admin account is later found to have acted
// improperly, so nothing here can edit or remove an entry.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);

  let query = supabase.from("admin_audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false });

  const actor = params.get("actor");
  if (actor) query = query.eq("actor", actor);
  const actionType = params.get("actionType");
  if (actionType) query = query.eq("action_type", actionType);
  const targetEntity = params.get("targetEntity");
  if (targetEntity) query = query.eq("target_entity", targetEntity);
  const from = params.get("from");
  if (from) query = query.gte("created_at", from);
  const to = params.get("to");
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
