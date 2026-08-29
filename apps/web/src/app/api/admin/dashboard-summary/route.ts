import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";
import { getConfig } from "@/server/appConfig";

type MonoEndpoint = "account_auth" | "account_details" | "account_transactions";

// A single-call overview for the admin dashboard landing page — pulls one
// headline number from each area already built (users, accounts, the
// suggestion queue, aggregator usage, the audit log) rather than making the
// admin visit five screens to see whether anything needs attention.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [usersRes, accountsCount, errorAccountsCount, pendingSuggestionsCount, monoCallsRes, pricing, auditRes] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("accounts").select("id", { count: "exact", head: true }).not("last_sync_error", "is", null),
    supabase.from("categorization_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("mono_api_calls").select("endpoint, outcome").gte("created_at", since7d),
    getConfig<Record<MonoEndpoint, number>>("mono_pricing"),
    supabase.from("admin_audit_log").select("actor, action_type, target_entity, target_id, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const users = usersRes.data?.users ?? [];
  const suspendedUsers = users.filter((u) => u.banned_until && new Date(u.banned_until) > new Date()).length;

  const monoCalls = monoCallsRes.data ?? [];
  const monoFailures = monoCalls.filter((c) => c.outcome === "failure").length;
  const monoCost = monoCalls.reduce((a, c) => a + (pricing[c.endpoint as MonoEndpoint] ?? 0), 0);

  const totalUsers = usersRes.data && "total" in usersRes.data ? usersRes.data.total : users.length;

  return NextResponse.json({
    totalUsers,
    suspendedUsers,
    totalAccounts: accountsCount.count ?? 0,
    accountsWithErrors: errorAccountsCount.count ?? 0,
    pendingSuggestions: pendingSuggestionsCount.count ?? 0,
    monoUsage7d: {
      totalCalls: monoCalls.length,
      failureRatePct: monoCalls.length ? Math.round((monoFailures / monoCalls.length) * 100) : 0,
      estimatedCost: monoCost,
    },
    recentAudit: auditRes.data ?? [],
  });
}
