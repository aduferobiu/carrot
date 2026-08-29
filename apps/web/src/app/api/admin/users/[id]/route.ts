import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(id);
  if (userError || !userRes.user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const u = userRes.user;

  // Account-health signals (AR-02): per-linked-account sync status, backed
  // by the last_synced_at/last_sync_error/failed_sync_count columns
  // recordSyncOutcome() now writes on every link/refresh attempt.
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, institution_name, name, last_synced_at, last_sync_error, failed_sync_count")
    .eq("user_id", id);

  const { count: personalRuleCount } = await supabase
    .from("categorization_rules")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      status: u.banned_until && new Date(u.banned_until) > new Date() ? "suspended" : "active",
    },
    accounts: accounts ?? [],
    personalRuleCount: personalRuleCount ?? 0,
  });
}

// Suspend/reactivate via Supabase Auth's own ban mechanism — banned_until
// in the future rejects all future sign-in attempts for this user without
// touching any of their data. Does not by itself invalidate an
// already-issued session token still inside its own expiry window; see the
// force-logout route for that distinct, weaker-guarantee action.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { action } = (await req.json()) as { action?: "suspend" | "reactivate" };
  if (action !== "suspend" && action !== "reactivate") {
    return NextResponse.json({ error: "action must be 'suspend' or 'reactivate'" }, { status: 400 });
  }

  const { data: before } = await supabase.auth.admin.getUserById(id);
  const { data, error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: action === "suspend" ? "876000h" : "none",
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Failed to update user" }, { status: 500 });

  await logAdminAction({
    actionType: action,
    targetEntity: "user",
    targetId: id,
    beforeState: { banned_until: before.user?.banned_until ?? null },
    afterState: { banned_until: data.user.banned_until ?? null },
  });
  return NextResponse.json({ ok: true });
}
