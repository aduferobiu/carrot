"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type AuditEntry = { actor: string; action_type: string; target_entity: string; target_id: string | null; created_at: string };

type Summary = {
  totalUsers: number;
  suspendedUsers: number;
  totalAccounts: number;
  accountsWithErrors: number;
  pendingSuggestions: number;
  monoUsage7d: { totalCalls: number; failureRatePct: number; estimatedCost: number };
  recentAudit: AuditEntry[];
};

const QUICK_LINKS: [string, string, string][] = [
  ["/admin/categorization", "Categorization engine", "Global rules, cross-user suggestions, and per-user learned rules"],
  ["/admin/users", "Users", "View, suspend, or erase a user's data"],
  ["/admin/mono-usage", "Aggregator usage", "Mono call volume, cost, and failure rate"],
  ["/admin/test-categorization", "Test categorization", "See how the live engine would resolve a sample description"],
  ["/admin/audit-log", "Audit log", "Every state-changing admin action, permanently recorded"],
  ["/admin/settings", "Settings", "Thresholds, pricing, and maintenance mode"],
];

function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-US");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Tile({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div style={s.card}>
      <div style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: warn ? "#DC2626" : "#15171C" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: warn ? "#DC2626" : "#8A8A98", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function AdminShell() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<Summary>("/api/admin/dashboard-summary")
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of the admin module">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

        {summary && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <Tile
                label="Users"
                value={summary.totalUsers}
                sub={summary.suspendedUsers > 0 ? `${summary.suspendedUsers} suspended` : "none suspended"}
                warn={summary.suspendedUsers > 0}
              />
              <Tile
                label="Linked accounts"
                value={summary.totalAccounts}
                sub={summary.accountsWithErrors > 0 ? `${summary.accountsWithErrors} with sync errors` : "all healthy"}
                warn={summary.accountsWithErrors > 0}
              />
              <Tile
                label="Pending suggestions"
                value={summary.pendingSuggestions}
                sub={summary.pendingSuggestions > 0 ? "awaiting review" : "queue is empty"}
                warn={summary.pendingSuggestions > 0}
              />
              <Tile
                label="Mono calls (7d)"
                value={summary.monoUsage7d.totalCalls}
                sub={`${summary.monoUsage7d.failureRatePct}% failed · ${naira(summary.monoUsage7d.estimatedCost)}`}
                warn={summary.monoUsage7d.failureRatePct >= 20}
              />
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={s.sectionTitle}>Recent admin activity</div>
                <Link href="/admin/audit-log" style={{ fontSize: 13, fontWeight: 700, color: "#2C6BFF", textDecoration: "none" }}>
                  View all →
                </Link>
              </div>
              {summary.recentAudit.length === 0 ? (
                <div style={{ padding: "12px 0", color: "#8A8A98", fontSize: 13 }}>No admin actions recorded yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>When</th>
                      <th style={s.th}>Actor</th>
                      <th style={s.th}>Action</th>
                      <th style={s.th}>Entity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentAudit.map((e, i) => (
                      <tr key={i}>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>{fmt(e.created_at)}</td>
                        <td style={s.td}>{e.actor}</td>
                        <td style={s.td}>{e.action_type}</td>
                        <td style={s.td}>{e.target_entity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <div>
          <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>Jump to</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {QUICK_LINKS.map(([href, title, sub]) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "16px 18px",
                  background: "#fff",
                  border: "1px solid #E6E6EB",
                  borderRadius: 16,
                  textDecoration: "none",
                  color: "#15171C",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 14.5 }}>{title} →</span>
                <span style={{ fontSize: 12.5, color: "#6B7280" }}>{sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
