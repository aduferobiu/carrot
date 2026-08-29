"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";

const ROUTES: [string, string, string][] = [
  ["/admin", "Dashboard", "home"],
  ["/admin/categorization", "Categorization", "list"],
];

export function AdminLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F5F5F7" }}>
      <aside
        style={{
          width: collapsed ? 84 : 248,
          flexShrink: 0,
          background: "#15171C",
          display: "flex",
          flexDirection: "column",
          padding: "22px 16px",
          transition: "width .18s ease",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 11, padding: "6px 8px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 11,
                background: "rgba(255,255,255,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              ◈
            </div>
            {!collapsed && <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em", whiteSpace: "nowrap", color: "#fff" }}>Carrot Admin</div>}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 8,
                background: "transparent",
                color: "rgba(255,255,255,.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ display: "flex", transform: "rotate(180deg)" }}>
                <Icon name="chevR" size={14} strokeWidth={2} />
              </span>
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            style={{
              width: 28,
              height: 28,
              alignSelf: "center",
              marginBottom: 14,
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 8,
              background: "transparent",
              color: "rgba(255,255,255,.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="chevR" size={14} strokeWidth={2} />
          </button>
        )}

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {ROUTES.map(([href, label, icon]) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 12,
                  height: 44,
                  padding: collapsed ? 0 : "0 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14.5,
                  background: isActive ? "rgba(255,255,255,.10)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,.55)",
                  textDecoration: "none",
                }}
              >
                <Icon name={icon} size={20} strokeWidth={isActive ? 2.15 : 1.9} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={logout}
            disabled={loggingOut}
            title={collapsed ? "Sign out" : undefined}
            style={{
              width: "100%",
              height: 44,
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 12,
              background: "transparent",
              color: "rgba(255,255,255,.75)",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: loggingOut ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: collapsed ? 0 : "0 12px",
            }}
          >
            <Icon name="logout" size={18} />
            {!collapsed && (loggingOut ? "Signing out…" : "Sign out")}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 74,
            flexShrink: 0,
            background: "#fff",
            borderBottom: "1px solid #E6E6EB",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</div>
            <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 1 }}>{subtitle}</div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: "28px 28px 60px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
