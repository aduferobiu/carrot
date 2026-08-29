import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";
import { type MonoEndpoint } from "@/server/monoUsageLog";
import { getConfig } from "@/server/appConfig";

type CallRow = { endpoint: MonoEndpoint; outcome: "success" | "failure"; failure_reason: string | null; created_at: string };
type MonoPricing = Record<MonoEndpoint, number>;

// AR-06: call volume by endpoint, estimated cost, failure rate over time,
// and a configurable alert condition. Pricing and alert thresholds are both
// admin-editable via AR-07's config screen (app_config table) rather than
// env vars — pricing defaults to 0 ("unconfigured") rather than a
// fabricated guess, since Mono's actual contract pricing isn't known here.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [{ data, error }, pricing, alertThresholds] = await Promise.all([
    supabase
      .from("mono_api_calls")
      .select("endpoint, outcome, failure_reason, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    getConfig<MonoPricing>("mono_pricing"),
    getConfig<{ failureRatePct: number; dailySpendNgn: number }>("mono_alert_thresholds"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const calls = (data ?? []) as CallRow[];

  const endpointStats = new Map<MonoEndpoint, { total: number; success: number; failure: number }>();
  for (const c of calls) {
    const s = endpointStats.get(c.endpoint) ?? { total: 0, success: 0, failure: 0 };
    s.total++;
    s[c.outcome]++;
    endpointStats.set(c.endpoint, s);
  }
  const byEndpoint = [...endpointStats.entries()].map(([endpoint, s]) => ({
    endpoint,
    total: s.total,
    success: s.success,
    failure: s.failure,
    failureRatePct: s.total ? Math.round((s.failure / s.total) * 100) : 0,
    estimatedCost: s.total * (pricing[endpoint] ?? 0),
  }));

  const dailyMap = new Map<string, { date: string; account_auth: number; account_details: number; account_transactions: number; failures: number; cost: number }>();
  for (const c of calls) {
    const day = c.created_at.slice(0, 10);
    const d = dailyMap.get(day) ?? { date: day, account_auth: 0, account_details: 0, account_transactions: 0, failures: 0, cost: 0 };
    d[c.endpoint]++;
    if (c.outcome === "failure") d.failures++;
    d.cost += pricing[c.endpoint] ?? 0;
    dailyMap.set(day, d);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const totalCalls = calls.length;
  const totalFailures = calls.filter((c) => c.outcome === "failure").length;
  const overallFailureRatePct = totalCalls ? Math.round((totalFailures / totalCalls) * 100) : 0;
  const totalCost = byEndpoint.reduce((a, e) => a + e.estimatedCost, 0);
  const pricingConfigured = Object.values(pricing).some((p) => p > 0);

  const alerts: string[] = [];
  const failureAlertPct = alertThresholds.failureRatePct || 20;
  if (totalCalls >= 5 && overallFailureRatePct >= failureAlertPct) {
    alerts.push(`Failure rate is ${overallFailureRatePct}% over the last ${days} day(s) — at or above the ${failureAlertPct}% alert threshold.`);
  }
  const dailySpendAlertNgn = alertThresholds.dailySpendNgn || 0;
  const todayRow = daily[daily.length - 1];
  if (dailySpendAlertNgn > 0 && todayRow && todayRow.cost >= dailySpendAlertNgn) {
    alerts.push(`Today's estimated spend (₦${todayRow.cost.toLocaleString()}) is at or above the ₦${dailySpendAlertNgn.toLocaleString()} alert threshold.`);
  }

  const recentFailures = calls.filter((c) => c.outcome === "failure").slice(0, 15);

  return NextResponse.json({ days, byEndpoint, daily, totalCalls, overallFailureRatePct, totalCost, pricingConfigured, alerts, recentFailures });
}
