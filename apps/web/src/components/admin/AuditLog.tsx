"use client";

import { Fragment, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type Entry = {
  id: string;
  actor: string;
  action_type: string;
  target_entity: string;
  target_id: string | null;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [actionType, setActionType] = useState("");
  const [targetEntity, setTargetEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ page: String(page) });
      if (actionType) p.set("actionType", actionType);
      if (targetEntity) p.set("targetEntity", targetEntity);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const res = await adminFetch<{ entries: Entry[]; total: number }>(`/api/admin/audit-log?${p}`);
      setEntries(res.entries);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <AdminLayout title="Audit Log" subtitle="Every state-changing admin action — permanent, unfilterable to edit or delete">
      <div style={s.card}>
        <form onSubmit={applyFilters} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input style={{ ...s.input, width: 160 }} placeholder="Action type…" value={actionType} onChange={(e) => setActionType(e.target.value)} />
          <input style={{ ...s.input, width: 160 }} placeholder="Target entity…" value={targetEntity} onChange={(e) => setTargetEntity(e.target.value)} />
          <input style={s.input} type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
          <input style={s.input} type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
          <button type="submit" style={s.btnPrimary}>
            Apply filters
          </button>
        </form>

        {error && <div style={{ color: "#B91C1C", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>When</th>
                  <th style={s.th}>Actor</th>
                  <th style={s.th}>Action</th>
                  <th style={s.th}>Entity</th>
                  <th style={s.th}>Target</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Fragment key={e.id}>
                    <tr>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>{fmt(e.created_at)}</td>
                      <td style={s.td}>{e.actor}</td>
                      <td style={s.td}>{e.action_type}</td>
                      <td style={s.td}>{e.target_entity}</td>
                      <td style={{ ...s.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{e.target_id ?? "—"}</td>
                      <td style={s.td}>
                        <button style={s.btnGhost} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                          {expanded === e.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr>
                        <td colSpan={6} style={{ ...s.td, background: "#FAFAFC" }}>
                          <div style={{ display: "flex", gap: 20 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>BEFORE</div>
                              <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {JSON.stringify(e.before_state, null, 2) ?? "null"}
                              </pre>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>AFTER</div>
                              <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {JSON.stringify(e.after_state, null, 2) ?? "null"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No matching entries.</div>}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <div style={{ fontSize: 12.5, color: "#8A8A98" }}>
                Page {page} · {total} total
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btnGhost} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <button style={s.btnGhost} disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
