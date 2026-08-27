"use client";

import { Icon } from "@/lib/kobo/icons";
import { rgba, timeAgo } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

export function NotificationsDrawer() {
  const { notifOpen, notifications, toggleNotif, markAllRead } = useKobo();
  if (!notifOpen) return null;

  return (
    <>
      <div onClick={toggleNotif} style={{ position: "fixed", inset: 0, background: "rgba(10,10,16,.28)", zIndex: 40 }} />
      <div
        className="kb-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 392,
          background: "#fff",
          zIndex: 41,
          boxShadow: "-20px 0 50px rgba(0,0,0,.12)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn .26s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 24px",
            borderBottom: "1px solid #EEE",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800 }}>Notifications</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span onClick={markAllRead} style={{ fontSize: 12.5, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}>
              Mark all read
            </span>
            <button
              onClick={toggleNotif}
              style={{
                width: 34,
                height: 34,
                border: "none",
                background: "#F2F2F5",
                borderRadius: 10,
                cursor: "pointer",
                color: "#4A4A57",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="x" size={17} strokeWidth={2.1} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {notifications.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#A0A0AC", fontSize: 13 }}>
              You&apos;re all caught up — no notifications yet.
            </div>
          )}
          {notifications.map((n) => {
            const color = n.color ?? "#2C6BFF";
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  gap: 13,
                  padding: 14,
                  borderRadius: 14,
                  background: !n.is_read ? "#F7FAFF" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: rgba(color, 0.13),
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={n.icon ?? "bell"} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: "#7A7A88", marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: "#A6A6B2", marginTop: 5 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2C6BFF", flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
