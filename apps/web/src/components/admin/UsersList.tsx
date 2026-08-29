"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  status: "active" | "suspended";
  account_count: number;
};

function fmt(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UsersList() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch<{ users: UserRow[]; total: number }>(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <AdminLayout title="Users" subtitle="Every registered user, their linked accounts, and account status">
      <div style={s.card}>
        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input style={{ ...s.input, width: 320 }} placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" style={s.btnPrimary}>
            Search
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
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Registered</th>
                  <th style={s.th}>Last login</th>
                  <th style={s.th}>Accounts</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>{fmt(u.created_at)}</td>
                    <td style={s.td}>{fmt(u.last_sign_in_at)}</td>
                    <td style={s.td}>{u.account_count}</td>
                    <td style={s.td}>
                      <span style={u.status === "active" ? s.badge("#DCFCE7", "#15803D") : s.badge("#FEE2E2", "#B91C1C")}>{u.status}</span>
                    </td>
                    <td style={s.td}>
                      <Link href={`/admin/users/${u.id}`} style={{ ...s.btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#8A8A98", fontSize: 13 }}>No users found.</div>}

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
