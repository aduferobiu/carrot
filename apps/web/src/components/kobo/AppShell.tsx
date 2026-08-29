"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { currentMonthStart, monthLabel } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { ProfileMenu } from "./ProfileMenu";
import { LinkAccountModal } from "./LinkAccountModal";
import { BudgetModal } from "./BudgetModal";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { HealthScoreModal } from "./HealthScoreModal";
import { ReauthModal } from "./ReauthModal";

const ROUTES: [string, string, string][] = [
  ["dashboard", "Home", "home"],
  ["transactions", "Transactions", "list"],
  ["budgets", "Budgets", "target"],
  ["insights", "Insights", "chart"],
  ["subscriptions", "Subscriptions", "refresh"],
  ["accounts", "Accounts", "wallet"],
  ["settings", "Settings", "settings"],
];

// The mobile bottom nav only has room for 5 — same set as before Subscriptions
// was added, so Subscriptions (like Settings) is desktop-sidebar-only for now.
const MOBILE_NAV_IDS = new Set(["dashboard", "transactions", "budgets", "insights", "accounts"]);

const SHORT_LABELS: Record<string, string> = {
  dashboard: "Home",
  transactions: "Activity",
  budgets: "Budgets",
  insights: "Insights",
  accounts: "Accounts",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname.replace("/", "") || "dashboard";
  const {
    authLoading,
    session,
    profile,
    notifications,
    toggleNotif,
    toggleProfile,
    openLink,
    txSearch,
    setTxSearch,
    maintenanceMode,
  } = useKobo();

  useEffect(() => {
    if (!authLoading && !session) router.push("/login");
  }, [authLoading, session, router]);

  // AR-07: blocks normal app usage in place of a message, regardless of
  // auth state — checked ahead of the loading/session gate below so it
  // takes effect even before a visitor signs in. Never affects /admin/*,
  // which lives outside this shell entirely.
  if (maintenanceMode.enabled) {
    return (
      <div className="kb-shell" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EBEBEF", padding: 24 }}>
        <div style={{ maxWidth: 420, background: "#fff", borderRadius: 24, padding: "40px 36px", textAlign: "center", boxShadow: "0 30px 70px rgba(15,23,42,.10)" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg,#2C6BFF,#5B8DFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              margin: "0 auto 20px",
            }}
          >
            ◈
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>Carrot is temporarily unavailable</div>
          <div style={{ fontSize: 14, color: "#6B6F7B", lineHeight: 1.5 }}>
            {maintenanceMode.message || "We're making some improvements. Please check back shortly."}
          </div>
        </div>
      </div>
    );
  }

  const titles: Record<string, [string, string]> = {
    dashboard: ["Home", `Good morning, ${profile?.fullName.split(" ")[0] ?? ""}`],
    transactions: ["Transactions", "Every account, one feed"],
    budgets: ["Budgets", `${monthLabel(currentMonthStart())} · category limits`],
    insights: ["Insights", "Patterns across six months"],
    subscriptions: ["Subscriptions", "Recurring charges Carrot has spotted"],
    accounts: ["Accounts", "Linked banks & wallets"],
    settings: ["Settings", "Profile, data & privacy"],
  };

  const hasUnread = notifications.some((n) => !n.is_read);
  const [pageTitle, pageSub] = titles[active] || ["", ""];
  const [collapsed, setCollapsed] = useState(false);

  if (authLoading || !session) {
    return (
      <div className="kb-shell" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EBEBEF" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "4px solid #E0E0E8",
            borderTopColor: "#2C6BFF",
            animation: "spin .8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div className="kb-shell" style={{ height: "100vh", display: "flex", background: "#EBEBEF" }}>
      <aside
        className="kb-sidebar"
        style={{
          width: collapsed ? 84 : 248,
          flexShrink: 0,
          background: "#fff",
          borderRight: "1px solid #E6E6EB",
          display: "flex",
          flexDirection: "column",
          padding: "22px 16px",
          transition: "width .18s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 11,
            padding: "6px 8px 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 11,
                background: "linear-gradient(135deg,#2C6BFF,#5B8DFF)",
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
            {!collapsed && (
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em", whiteSpace: "nowrap" }}>Carrot</div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                border: "1px solid #E6E6EB",
                borderRadius: 8,
                background: "#fff",
                color: "#8A8A98",
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
              border: "1px solid #E6E6EB",
              borderRadius: 8,
              background: "#fff",
              color: "#8A8A98",
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
          {ROUTES.map(([id, label, icon]) => {
            const isActive = active === id;
            return (
              <Link
                key={id}
                href={`/${id}`}
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
                  background: isActive ? "rgba(44,107,255,0.10)" : "transparent",
                  color: isActive ? "#2C6BFF" : "#6B6F7B",
                  textDecoration: "none",
                }}
              >
                <Icon name={icon} size={20} strokeWidth={isActive ? 2.15 : 1.9} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={openLink}
            title={collapsed ? "Link account" : undefined}
            style={{
              height: 44,
              border: "1px dashed #C9C9D4",
              borderRadius: 12,
              background: "#fff",
              color: "#2C6BFF",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="plus" size={17} strokeWidth={2.2} />
            {!collapsed && "Link account"}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          className="kb-header"
          style={{
            height: 74,
            flexShrink: 0,
            background: "#fff",
            borderBottom: "1px solid #E6E6EB",
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "0 28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="kb-htitle" style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>
              {pageTitle}
            </div>
            <div className="kb-hsub" style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 1 }}>
              {pageSub}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            className="kb-search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              height: 42,
              width: 230,
              padding: "0 14px",
              borderRadius: 12,
              background: "#F2F2F5",
              color: "#8A8A98",
            }}
          >
            <Icon name="search" size={18} />
            <input
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Search transactions"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inherit",
                fontSize: 13.5,
                color: "#15171C",
              }}
            />
          </div>
          <button
            onClick={toggleNotif}
            style={{
              position: "relative",
              width: 42,
              height: 42,
              borderRadius: 12,
              border: "1px solid #E6E6EB",
              background: "#fff",
              color: "#4A4A57",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bell" size={20} />
            {hasUnread && (
              <span
                style={{
                  position: "absolute",
                  top: 9,
                  right: 10,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4444",
                  border: "2px solid #fff",
                }}
              />
            )}
          </button>
          <div
            onClick={toggleProfile}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              cursor: "pointer",
              padding: "4px 4px 4px 6px",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "linear-gradient(135deg,#F26B21,#DB2777)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {profile?.initials ?? "…"}
            </div>
            <Icon name="chevD" size={16} />
          </div>
        </header>

        <div className="kb-content" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "26px 28px 60px" }}>
          {children}
        </div>
      </div>

      <nav
        className="kb-bottomnav"
        style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderTop: "1px solid #E6E6EB",
          zIndex: 35,
          alignItems: "stretch",
          justifyContent: "space-around",
          padding: "6px 4px calc(6px + env(safe-area-inset-bottom))",
        }}
      >
        {ROUTES.filter(([id]) => MOBILE_NAV_IDS.has(id)).map(([id, , icon]) => {
          const isActive = active === id;
          return (
            <Link
              key={id}
              href={`/${id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                flex: 1,
                minHeight: 52,
                cursor: "pointer",
                color: isActive ? "#2C6BFF" : "#6B6F7B",
                fontWeight: 700,
                fontSize: 10.5,
                borderRadius: 14,
                background: isActive ? "rgba(44,107,255,0.10)" : "transparent",
                textDecoration: "none",
              }}
            >
              <span style={{ position: "relative", display: "flex" }}>
                <Icon name={icon} size={20} strokeWidth={isActive ? 2.15 : 1.9} />
              </span>
              <span>{SHORT_LABELS[id]}</span>
            </Link>
          );
        })}
      </nav>

      <NotificationsDrawer />
      <ProfileMenu />
      <LinkAccountModal />
      <BudgetModal />
      <HealthScoreModal />
      <CategoryPickerModal />
      <TransactionDetailModal />
      <ReauthModal />
    </div>
  );
}
