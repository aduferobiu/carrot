"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type EndpointStat = { endpoint: string; total: number; success: number; failure: number; failureRatePct: number; estimatedCost: number };
type DailyRow = { date: string; account_auth: number; account_details: number; account_transactions: number; failures: number; cost: number };
type Failure = { endpoint: string; failure_reason: string | null; created_at: string };

type UsageData = {
  days: number;
  byEndpoint: EndpointStat[];
  daily: DailyRow[];
  totalCalls: number;
  overallFailureRatePct: number;
  totalCost: number;
  pricingConfigured: boolean;
  alerts: string[];
  recentFailures: Failure[];
};

const ENDPOINT_LABEL: Record<string, string> = {
  account_auth: "Account linking",
  account_details: "Balance retrieval",
  account_transactions: "Transaction retrieval",
};

function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-US");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function MonoUsage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch<UsageData>(`/api/admin/mono-usage?days=${days}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <AdminLayout title="Aggregator Usage" subtitle="Mono API call volume, estimated cost, and failure rate">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid #E6E6EB", borderRadius: 12, padding: 5, width: "fit-content" }}>
          {[7, 30, 90].map((d) => (
            <button key={d} style={s.tabBtn(days === d)} onClick={() => setDays(d)}>
              Last {d} days
            </button>
          ))}
        </div>

        {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

        {loading || !data ? (
          <div style={s.card}>Loading…</div>
        ) : (
          <>
            {data.alerts.length > 0 && (
              <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#B91C1C", marginBottom: 6 }}>⚠ Alert</div>
                {data.alerts.map((a, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#991B1B" }}>
                    {a}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={s.card}>
                <div style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>Total calls</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{data.totalCalls}</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>Failure rate</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: data.overallFailureRatePct >= 20 ? "#DC2626" : "#15171C" }}>
                  {data.overallFailureRatePct}%
                </div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>Estimated cost</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{naira(data.totalCost)}</div>
                {!data.pricingConfigured && (
                  <div style={{ fontSize: 11, color: "#8A8A98", marginTop: 4 }}>
                    Pricing not configured — set it in Settings to reflect your real plan.
                  </div>
                )}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.sectionTitle}>By endpoint</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Endpoint</th>
                    <th style={s.th}>Total</th>
                    <th style={s.th}>Success</th>
                    <th style={s.th}>Failure</th>
                    <th style={s.th}>Failure rate</th>
                    <th style={s.th}>Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byEndpoint.map((e) => (
                    <tr key={e.endpoint}>
                      <td style={s.td}>{ENDPOINT_LABEL[e.endpoint] ?? e.endpoint}</td>
                      <td style={s.td}>{e.total}</td>
                      <td style={s.td}>{e.success}</td>
                      <td style={s.td}>{e.failure}</td>
                      <td style={s.td}>
                        <span style={e.failureRatePct >= 20 ? s.badge("#FEE2E2", "#B91C1C") : s.badge("#F2F2F5", "#6B7280")}>{e.failureRatePct}%</span>
                      </td>
                      <td style={s.td}>{naira(e.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.byEndpoint.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No calls logged in this window.</div>}
            </div>

            <div style={s.card}>
              <div style={s.sectionTitle}>Daily volume</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Account linking</th>
                    <th style={s.th}>Balance retrieval</th>
                    <th style={s.th}>Transaction retrieval</th>
                    <th style={s.th}>Failures</th>
                    <th style={s.th}>Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => (
                    <tr key={d.date}>
                      <td style={s.td}>{d.date}</td>
                      <td style={s.td}>{d.account_auth}</td>
                      <td style={s.td}>{d.account_details}</td>
                      <td style={s.td}>{d.account_transactions}</td>
                      <td style={s.td}>{d.failures > 0 ? <span style={{ color: "#DC2626" }}>{d.failures}</span> : 0}</td>
                      <td style={s.td}>{naira(d.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.daily.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No calls logged in this window.</div>}
            </div>

            <div style={s.card}>
              <div style={s.sectionTitle}>Recent failures</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>When</th>
                    <th style={s.th}>Endpoint</th>
                    <th style={s.th}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentFailures.map((f, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>{fmt(f.created_at)}</td>
                      <td style={s.td}>{ENDPOINT_LABEL[f.endpoint] ?? f.endpoint}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#B91C1C" }}>{f.failure_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.recentFailures.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No failures in this window.</div>}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
