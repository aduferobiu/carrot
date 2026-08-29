"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type UserInfo = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  status: "active" | "suspended";
};

type AccountHealth = {
  id: string;
  institution_name: string | null;
  name: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  failed_sync_count: number;
};

type PersonalRule = {
  id: string;
  category_id: string;
  keyword: string;
  source: string;
  status: "active" | "disabled";
  match_count: number;
};

const SOURCE_LABEL: Record<string, string> = {
  user_derived: "Auto-learned",
  restricted_suggestion: "Restricted from suggestion",
  seed: "Seed",
};

function fmt(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UserDetail({ userId }: { userId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accounts, setAccounts] = useState<AccountHealth[]>([]);
  const [rules, setRules] = useState<PersonalRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [detail, rulesRes, catRes] = await Promise.all([
        adminFetch<{ user: UserInfo; accounts: AccountHealth[]; personalRuleCount: number }>(`/api/admin/users/${userId}`),
        adminFetch<{ rules: PersonalRule[] }>(`/api/admin/personal-rules?userId=${userId}`),
        adminFetch<{ categories: Category[] }>("/api/admin/categories"),
      ]);
      setUser(detail.user);
      setAccounts(detail.accounts);
      setRules(rulesRes.rules);
      setCategories(catRes.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  async function toggleSuspend() {
    if (!user) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: user.status === "active" ? "suspend" : "reactivate" }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    if (!user) return;
    if (!confirm(`Permanently erase all data for ${user.email}? This mirrors the user's own account-deletion flow and cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
      router.push("/admin/users");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user data");
      setBusy(false);
    }
  }

  if (loading) return <AdminLayout title="User" subtitle="Loading…"><div style={s.card}>Loading…</div></AdminLayout>;
  if (!user) return <AdminLayout title="User" subtitle="Not found"><div style={s.card}>{error || "User not found"}</div></AdminLayout>;

  const hasErrorAccount = accounts.some((a) => a.last_sync_error);

  return (
    <AdminLayout title={user.email ?? "User"} subtitle={`Registered ${fmt(user.created_at)}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={s.sectionTitle}>{user.email}</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "#6B7280", marginTop: 6 }}>
                <span>Status: <span style={user.status === "active" ? s.badge("#DCFCE7", "#15803D") : s.badge("#FEE2E2", "#B91C1C")}>{user.status}</span></span>
                <span>Last login: {fmt(user.last_sign_in_at)}</span>
                {hasErrorAccount && <span style={s.badge("#FEE2E2", "#B91C1C")}>Account sync error</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={user.status === "active" ? s.btnDanger : s.btnGood} disabled={busy} onClick={toggleSuspend}>
                {user.status === "active" ? "Suspend" : "Reactivate"}
              </button>
              <button style={s.btnDanger} disabled={busy} onClick={deleteData}>
                Erase data (NDPR)
              </button>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sectionTitle}>Linked accounts</div>
          <div style={s.sectionSub}>Sync health only — no balances, no transactions.</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Institution</th>
                <th style={s.th}>Last successful sync</th>
                <th style={s.th}>Failed attempts</th>
                <th style={s.th}>Last error</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td style={s.td}>{a.institution_name ?? a.name}</td>
                  <td style={s.td}>{fmt(a.last_synced_at)}</td>
                  <td style={s.td}>{a.failed_sync_count > 0 ? <span style={{ color: "#DC2626" }}>{a.failed_sync_count}</span> : 0}</td>
                  <td style={{ ...s.td, fontSize: 12, color: "#B91C1C" }}>{a.last_sync_error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No linked accounts.</div>}
        </div>

        <div style={s.card}>
          <div style={s.sectionTitle}>Personal categorization rules</div>
          <div style={s.sectionSub}>Learned from this user&apos;s own correction history.</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Beneficiary / keyword</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Matched</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...s.td, fontFamily: "ui-monospace,monospace" }}>{r.keyword}</td>
                  <td style={s.td}>{categoryName(r.category_id)}</td>
                  <td style={s.td}>{SOURCE_LABEL[r.source] ?? r.source}</td>
                  <td style={s.td}>{r.match_count}</td>
                  <td style={s.td}>
                    <span style={r.status === "active" ? s.badge("#DCFCE7", "#15803D") : s.badge("#F2F2F5", "#6B7280")}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No personal rules yet.</div>}
        </div>
      </div>
    </AdminLayout>
  );
}
