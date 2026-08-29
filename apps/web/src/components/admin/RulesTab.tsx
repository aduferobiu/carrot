"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type GlobalRule = {
  id: string;
  category_id: string;
  keyword: string;
  priority: number;
  status: "active" | "disabled";
  match_count: number;
};

const ICONS = ["cart", "car", "zap", "health", "book", "bag", "play", "building", "trend", "swap", "income", "cash", "grid"];

export function RulesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<GlobalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [newCatKind, setNewCatKind] = useState<"income" | "expense">("expense");
  const [newCatIcon, setNewCatIcon] = useState(ICONS[0]);
  const [newCatColor, setNewCatColor] = useState("#6B7280");

  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");

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
  const parents = categories.filter((c) => !c.parent_id);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  async function createCategory() {
    if (!newCatName.trim() || !newCatParent) return;
    try {
      await adminFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim(), kind: newCatKind, icon: newCatIcon, color: newCatColor, parent_id: newCatParent }),
      });
      setNewCatName("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category");
    }
  }

  async function toggleCategory(cat: Category) {
    try {
      await adminFetch(`/api/admin/categories/${cat.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !cat.is_active }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update category");
    }
  }

  async function renameCategory(cat: Category) {
    const name = prompt("New name", cat.name);
    if (!name || !name.trim() || name === cat.name) return;
    try {
      await adminFetch(`/api/admin/categories/${cat.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename category");
    }
  }

  async function createRule() {
    if (!newRuleKeyword.trim() || !newRuleCategory) return;
    try {
      await adminFetch("/api/admin/rules", { method: "POST", body: JSON.stringify({ keyword: newRuleKeyword.trim(), category_id: newRuleCategory }) });
      setNewRuleKeyword("");
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
        <div style={s.sectionTitle}>Categories</div>
        <div style={s.sectionSub}>Disabling is soft — existing transactions keep their label; it just leaves the live matching set and the correction dropdown.</div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Parent</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Kind</th>
              <th style={s.th}>Status</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((c) => {
              const parent = categories.find((p) => p.id === c.parent_id);
              return (
                <tr key={c.id}>
                  <td style={{ ...s.td, color: "#8A8A98" }}>{parent?.name ?? "—"}</td>
                  <td style={s.td}>{c.name}</td>
                  <td style={s.td}>{c.kind}</td>
                  <td style={s.td}>
                    <span style={c.is_active ? s.badge("#DCFCE7", "#15803D") : s.badge("#F2F2F5", "#6B7280")}>{c.is_active ? "Active" : "Disabled"}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={s.btnGhost} onClick={() => renameCategory(c)}>
                        Rename
                      </button>
                      <button style={c.is_active ? s.btnDanger : s.btnGood} onClick={() => toggleCategory(c)}>
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...s.input, width: 200 }} placeholder="New category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <select style={s.select} value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}>
            <option value="">Parent…</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select style={s.select} value={newCatKind} onChange={(e) => setNewCatKind(e.target.value as "income" | "expense")}>
            <option value="expense">expense</option>
            <option value="income">income</option>
          </select>
          <select style={s.select} value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)}>
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <input style={{ ...s.input, width: 90 }} type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} />
          <button style={s.btnPrimary} onClick={createCategory}>
            Add category
          </button>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.sectionTitle}>Global rules</div>
        <div style={s.sectionSub}>Evaluated top to bottom — first match wins. Use ↑/↓ to reorder so a narrow rule can sit above a broader one.</div>

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

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input style={{ ...s.input, width: 260 }} placeholder="Keyword (normalized text)" value={newRuleKeyword} onChange={(e) => setNewRuleKeyword(e.target.value)} />
          <select style={s.select} value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}>
            <option value="">Category…</option>
            {leaves.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c.id)}
              </option>
            ))}
          </select>
          <button style={s.btnPrimary} onClick={createRule}>
            Add rule
          </button>
        </div>
      </div>
    </div>
  );
}
