"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/kobo/data";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type Suggestion = {
  id: string;
  normalized_description: string;
  proposed_category_id: string;
  correction_count: number;
  sample_descriptions: string[];
  contributing_user_ids: string[];
  status: "pending" | "approved_global" | "restricted" | "rejected";
};

export function SuggestionsTab() {
  const [view, setView] = useState<"pending" | "rejected">("pending");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [sugRes, catRes] = await Promise.all([
        adminFetch<{ suggestions: Suggestion[] }>(`/api/admin/suggestions?status=${view}`),
        adminFetch<{ categories: Category[] }>("/api/admin/categories"),
      ]);
      setSuggestions(sugRes.suggestions);
      setCategories(catRes.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  async function act(id: string, path: string, body?: unknown) {
    setBusyId(id);
    setError("");
    try {
      await adminFetch(`/api/admin/suggestions/${id}${path}`, { method: path === "" ? "DELETE" : "POST", body: body ? JSON.stringify(body) : undefined });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={s.card}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid #E6E6EB", borderRadius: 12, padding: 5, width: "fit-content" }}>
        <button style={s.tabBtn(view === "pending")} onClick={() => setView("pending")}>
          Pending
        </button>
        <button style={s.tabBtn(view === "rejected")} onClick={() => setView("rejected")}>
          Rejected
        </button>
      </div>

      {suggestions.length === 0 && <div style={s.card}>No {view} suggestions right now.</div>}

      {suggestions.map((sug) => (
        <div key={sug.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700 }}>{sug.normalized_description}</div>
              <div style={{ fontSize: 12.5, color: "#6B7280", marginTop: 4 }}>
                Proposed category: <strong>{categoryName(sug.proposed_category_id)}</strong> · {sug.correction_count} corrections ·{" "}
                {sug.contributing_user_ids.length} user(s)
              </div>
            </div>
            {view === "pending" ? (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={s.btnGood} disabled={busyId === sug.id} onClick={() => act(sug.id, "/approve-global")}>
                  Approve → Global
                </button>
                <button style={s.btnNeutral} disabled={busyId === sug.id} onClick={() => act(sug.id, "/restrict", {})}>
                  Restrict to user(s)
                </button>
                <button style={s.btnDanger} disabled={busyId === sug.id} onClick={() => act(sug.id, "/reject")}>
                  Reject
                </button>
              </div>
            ) : (
              <button style={s.btnNeutral} disabled={busyId === sug.id} onClick={() => act(sug.id, "")}>
                Clear rejection
              </button>
            )}
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>
            Sample transaction descriptions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sug.sample_descriptions.map((d, i) => (
              <div key={i} style={{ fontSize: 12, fontFamily: "ui-monospace,monospace", color: "#4A4A57", background: "#FAFAFC", padding: "6px 10px", borderRadius: 8 }}>
                {d}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
