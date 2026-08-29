"use client";

import Link from "next/link";
import { AdminLayout } from "./AdminLayout";

export function AdminShell() {
  return (
    <AdminLayout title="Dashboard" subtitle="Overview of the admin module">
      <div style={{ fontSize: 14, color: "#6B6F7B", marginBottom: 24 }}>
        You&apos;re signed in. More admin pages will land here as they&apos;re built.
      </div>

      <Link
        href="/admin/categorization"
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: 4,
          padding: "18px 20px",
          background: "#fff",
          border: "1px solid #E6E6EB",
          borderRadius: 16,
          textDecoration: "none",
          color: "#15171C",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 15 }}>Categorization engine →</span>
        <span style={{ fontSize: 13, color: "#6B6F7B" }}>Global rules, cross-user suggestions, and per-user learned rules</span>
      </Link>
    </AdminLayout>
  );
}
