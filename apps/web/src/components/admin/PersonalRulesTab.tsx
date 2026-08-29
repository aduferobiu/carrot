"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type PersonalRule = {
  id: string;
  user_id: string;
  user_email: string;
  category_id: string;
  keyword: string;
  source: "user_derived" | "restricted_suggestion" | "seed";
  status: "active" | "disabled";
  match_count: number;
};

const SOURCE_LABEL: Record<string, string> = {
  user_derived: "Auto-learned",
  restricted_suggestion: "Restricted from suggestion",
  seed: "Seed",
};

export function PersonalRulesTab() {
  const [rules, setRules] = useState<PersonalRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rulesRes, catRes] = await Promise.all([
        adminFetch<{ rules: PersonalRule[] }>("/api/admin/personal-rules"),
        adminFetch<{ categories: Category[] }>("/api/admin/categories"),
      ]);
      setRules(rulesRes.rules);
      setCategories(catRes.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => r.user_email.toLowerCase().includes(q) || r.keyword.toLowerCase().includes(q));
  }, [rules, search]);

  async function toggleStatus(rule: PersonalRule) {
    try {
      await adminFetch(`/api/admin/personal-rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: rule.status === "active" ? "disabled" : "active" }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    }
  }

  async function deleteRule(rule: PersonalRule) {
    if (!confirm(`Delete this personal rule for ${rule.user_email}?`)) return;
    try {
      await adminFetch(`/api/admin/personal-rules/${rule.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  }

  if (loading) return <div style={s.card}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

      <div style={s.card}>
        <div style={s.sectionTitle}>Personal rules</div>
        <div style={s.sectionSub}>
          Learned per user from their own correction history — these activate automatically, without approval. Disable or delete one that&apos;s been
          mis-learned.
        </div>

        <input
          style={{ ...s.input, width: 320, marginBottom: 14 }}
          placeholder="Search by user email or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Beneficiary / keyword</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Source</th>
              <th style={s.th}>Matched</th>
              <th style={s.th}>Status</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>{r.user_email}</td>
                <td style={{ ...s.td, fontFamily: "ui-monospace,monospace" }}>{r.keyword}</td>
                <td style={s.td}>{categoryName(r.category_id)}</td>
                <td style={s.td}>{SOURCE_LABEL[r.source] ?? r.source}</td>
                <td style={s.td}>{r.match_count}</td>
                <td style={s.td}>
                  <span style={r.status === "active" ? s.badge("#DCFCE7", "#15803D") : s.badge("#F2F2F5", "#6B7280")}>{r.status}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={r.status === "active" ? s.btnDanger : s.btnGood} onClick={() => toggleStatus(r)}>
                      {r.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button style={s.btnDanger} onClick={() => deleteRule(r)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No personal rules found.</div>}
      </div>
    </div>
  );
}
