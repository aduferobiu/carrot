"use client";

import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { accountCode, accountGradient } from "@/lib/kobo/data";
import { naira } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

export function AccountsPage() {
  const { accounts, openLink, openReauth, refreshAll } = useKobo();
  const [refreshing, setRefreshing] = useState(false);
  const total = accounts.reduce((a, b) => a + b.balance, 0);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 14, color: "#6B6F7B", fontWeight: 600 }}>{naira(total)} across your linked accounts</div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            height: 40,
            padding: "0 16px",
            border: "1px solid #E6E6EB",
            borderRadius: 12,
            background: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13,
            cursor: refreshing ? "not-allowed" : "pointer",
            color: refreshing ? "#A0A0AC" : "#4A4A57",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="refresh" size={17} /> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {accounts.map((a) => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 15,
                background: accountGradient(a),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {accountCode(a)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{a.name}</div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#ECFDF3",
                    color: "#0E9E6A",
                    padding: "3px 9px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#12B76A" }} />
                  Synced
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 4, fontFamily: "ui-monospace,monospace" }}>
                {a.type} · {a.masked_number}
              </div>
            </div>
            <div style={{ textAlign: "right", marginRight: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{naira(a.balance)}</div>
            </div>
            <button
              onClick={() => openReauth("removeAccount", a.id)}
              style={{
                width: 38,
                height: 38,
                border: "1px solid #E6E6EB",
                background: "#fff",
                borderRadius: 11,
                cursor: "pointer",
                color: "#A0A0AC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        ))}
        <button
          onClick={openLink}
          style={{
            height: 64,
            border: "1.5px dashed #C9C9D4",
            borderRadius: 18,
            background: "#fff",
            color: "#2C6BFF",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Icon name="plus" size={17} strokeWidth={2.2} /> Link another account
        </button>
      </div>
    </div>
  );
}
