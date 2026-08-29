import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";

// Mirrors — deliberately does not exceed — the deletion the user can
// already trigger themselves (confirmReauth's "delete" branch in
// lib/kobo/store.tsx): wipes accounts, transactions, budgets, and
// notifications for this user_id, then signs out. AR-02 is explicit that
// admin must not get a separate, faster, less-compliant path, so this is
// intentionally not more thorough than that flow — including its existing
// gap of leaving the auth.users row and personal categorization_rules
// behind. Fixing that gap is a real, separate improvement to flag, not
// something to silently add only on the admin side.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const { data: userRes } = await supabase.auth.admin.getUserById(id);
  if (!userRes.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [accounts, transactions, budgets, notifications] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id),
  ]);
  const beforeCounts = {
    accounts: accounts.count ?? 0,
    transactions: transactions.count ?? 0,
    budgets: budgets.count ?? 0,
    notifications: notifications.count ?? 0,
  };

  const results = await Promise.all([
    supabase.from("accounts").delete().eq("user_id", id),
    supabase.from("transactions").delete().eq("user_id", id),
    supabase.from("budgets").delete().eq("user_id", id),
    supabase.from("notifications").delete().eq("user_id", id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  await logAdminAction({
    actionType: "delete_data",
    targetEntity: "user",
    targetId: id,
    beforeState: { email: userRes.user.email, deletedRowCounts: beforeCounts },
  });
  return NextResponse.json({ ok: true, deletedRowCounts: beforeCounts });
}
