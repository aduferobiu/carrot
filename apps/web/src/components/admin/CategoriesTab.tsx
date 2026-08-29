"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { adminFetch } from "./adminFetch";
import { AdminModal } from "./AdminModal";
import * as s from "./adminStyles";

const ICONS = ["cart", "car", "zap", "health", "book", "bag", "play", "building", "trend", "swap", "income", "cash", "grid"];

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [newCatKind, setNewCatKind] = useState<"income" | "expense">("expense");
  const [newCatIcon, setNewCatIcon] = useState(ICONS[0]);
  const [newCatColor, setNewCatColor] = useState("#6B7280");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch<{ categories: Category[] }>("/api/admin/categories");
      setCategories(res.categories);
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

  function openModal() {
    setNewCatName("");
    setNewCatParent("");
    setNewCatKind("expense");
    setNewCatIcon(ICONS[0]);
    setNewCatColor("#6B7280");
    setModalOpen(true);
  }

  async function createCategory() {
    if (!newCatName.trim() || !newCatParent) {
      setError("Name and parent are required");
      return;
    }
    try {
      await adminFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim(), kind: newCatKind, icon: newCatIcon, color: newCatColor, parent_id: newCatParent }),
      });
      setModalOpen(false);
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

  if (loading) return <div style={s.card}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={s.sectionTitle}>Categories</div>
            <div style={s.sectionSub}>
              Disabling is soft — existing transactions keep their label; it just leaves the live matching set and the correction dropdown.
            </div>
          </div>
          <button style={s.btnPrimary} onClick={openModal}>
            Add category
          </button>
        </div>

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
      </div>

      {modalOpen && (
        <AdminModal title="Add category" onClose={() => setModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Name</div>
              <input style={{ ...s.input, width: "100%" }} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Pet Care" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Parent</div>
              <select style={{ ...s.select, width: "100%" }} value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}>
                <option value="">Choose a parent…</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Kind</div>
                <select style={{ ...s.select, width: "100%" }} value={newCatKind} onChange={(e) => setNewCatKind(e.target.value as "income" | "expense")}>
                  <option value="expense">expense</option>
                  <option value="income">income</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Icon</div>
                <select style={{ ...s.select, width: "100%" }} value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)}>
                  {ICONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Color</div>
                <input style={{ ...s.input, width: 60 }} type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} />
              </div>
            </div>
            <button style={{ ...s.btnPrimary, marginTop: 8 }} onClick={createCategory}>
              Add category
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
