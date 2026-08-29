"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { adminFetch } from "./adminFetch";
import { AdminModal } from "./AdminModal";
import * as s from "./adminStyles";
import { TestCategorizationWidget } from "./TestCategorizationWidget";

type GlobalRule = {
  id: string;
  category_id: string;
  keyword: string;
  priority: number;
  status: "active" | "disabled";
  match_count: number;
};

export function RulesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<GlobalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");
  const [testingNewRule, setTestingNewRule] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [catsRes, rulesRes] = await Promise.all([
        adminFetch<{ categories: Category[] }>("/api/admin/categories"),
        adminFetch<{ rules: GlobalRule[] }>("/api/admin/rules"),
      ]);
      setCategories(catsRes.categories);
      setRules(rulesRes.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const leaves = categories.filter((c) => c.parent_id);

  function openModal() {
    setNewRuleKeyword("");
    setNewRuleCategory("");
    setTestingNewRule(false);
    setModalOpen(true);
  }

  async function createRule() {
    if (!newRuleKeyword.trim() || !newRuleCategory) {
      setError("Keyword and category are required");
      return;
    }
    try {
      await adminFetch("/api/admin/rules", { method: "POST", body: JSON.stringify({ keyword: newRuleKeyword.trim(), category_id: newRuleCategory }) });
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rule");
    }
  }

  async function updateRuleCategory(rule: GlobalRule, category_id: string) {
    try {
      await adminFetch(`/api/admin/rules/${rule.id}`, { method: "PATCH", body: JSON.stringify({ category_id }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    }
  }

  async function toggleRuleStatus(rule: GlobalRule) {
    try {
      await adminFetch(`/api/admin/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: rule.status === "active" ? "disabled" : "active" }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    }
  }

  async function deleteRule(rule: GlobalRule) {
    if (!confirm(`Delete the rule "${rule.keyword}"? This can't be undone.`)) return;
    try {
      await adminFetch(`/api/admin/rules/${rule.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  }

  async function move(rule: GlobalRule, direction: -1 | 1) {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((r) => r.id === rule.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    try {
      await adminFetch("/api/admin/rules/reorder", { method: "POST", body: JSON.stringify({ orderedIds: sorted.map((r) => r.id) }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder rules");
    }
  }

  if (loading) return <div style={s.card}>Loading…</div>;

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={s.sectionTitle}>Global rules</div>
            <div style={s.sectionSub}>Evaluated top to bottom — first match wins. Use ↑/↓ to reorder so a narrow rule can sit above a broader one.</div>
          </div>
          <button style={s.btnPrimary} onClick={openModal}>
            Add rule
          </button>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Order</th>
              <th style={s.th}>Keyword</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Matched</th>
              <th style={s.th}>Status</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={s.btnGhost} onClick={() => move(r, -1)}>
                      ↑
                    </button>
                    <button style={s.btnGhost} onClick={() => move(r, 1)}>
                      ↓
                    </button>
                  </div>
                </td>
                <td style={{ ...s.td, fontFamily: "ui-monospace,monospace" }}>{r.keyword}</td>
                <td style={s.td}>
                  <select style={s.select} value={r.category_id} onChange={(e) => updateRuleCategory(r, e.target.value)}>
                    {leaves.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={s.td}>{r.match_count === 0 ? <span style={{ color: "#DC2626" }}>0 (dead weight?)</span> : r.match_count}</td>
                <td style={s.td}>
                  <span style={r.status === "active" ? s.badge("#DCFCE7", "#15803D") : s.badge("#F2F2F5", "#6B7280")}>{r.status}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={r.status === "active" ? s.btnDanger : s.btnGood} onClick={() => toggleRuleStatus(r)}>
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
      </div>

      {modalOpen && (
        <AdminModal title="Add rule" onClose={() => setModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Keyword (normalized text)</div>
              <input style={{ ...s.input, width: "100%" }} value={newRuleKeyword} onChange={(e) => setNewRuleKeyword(e.target.value)} placeholder="e.g. vat charges" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Category</div>
              <select style={{ ...s.select, width: "100%" }} value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}>
                <option value="">Choose a category…</option>
                {leaves.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button style={s.btnPrimary} onClick={createRule}>
                Add rule
              </button>
              <button style={s.btnGhost} onClick={() => setTestingNewRule((v) => !v)}>
                {testingNewRule ? "Hide test" : "Test first"}
              </button>
            </div>

            {testingNewRule && (
              <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid #F0F0F3" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 10 }}>
                  Test before saving
                </div>
                <TestCategorizationWidget initialDescription={newRuleKeyword} />
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
