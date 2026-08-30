"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { Subscription } from "@/lib/kobo/data";
import { sortedTx, subscriptionRowView, txView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

export function SubscriptionDetailModal({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const { transactions, accounts, categories, dismissSubscription, renameSubscription } = useKobo();
  const view = subscriptionRowView(subscription, categories);
  const [name, setName] = useState(view.name);

  useEffect(() => {
    setName(view.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription.id]);

  const trimmedName = name.trim();
  const nameDirty = trimmedName.length > 0 && trimmedName !== view.name;

  function commitName() {
    if (nameDirty) renameSubscription(subscription.id, trimmedName);
  }

  const matches = sortedTx(
    transactions.filter((t) => t.account_id === subscription.account_id && t.normalized_description === subscription.merchant_label),
  );

  function notASubscription() {
    dismissSubscription(subscription.id);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="kb-modalwrap"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,16,.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="kb-sheet"
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "min(640px, 84vh)",
          background: "#fff",
          borderRadius: 24,
          animation: "pop .2s ease both",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px",
            borderBottom: "1px solid #F0F0F3",
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>Subscription details</div>
          <button
            onClick={onClose}
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

        <div style={{ padding: "18px 22px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: view.iconBg,
                color: view.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={view.icon} size={19} />
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setName(view.name);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                border: "1.5px solid #E6E6EB",
                borderRadius: 10,
                padding: "6px 8px",
                marginLeft: -8,
                outline: "none",
                background: "transparent",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 17,
                color: "#15171C",
              }}
            />
            {nameDirty && (
              <button
                onClick={commitName}
                style={{
                  height: 36,
                  padding: "0 14px",
                  border: "none",
                  borderRadius: 10,
                  background: "#2C6BFF",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Save
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12.5, color: "#8A8A98", marginBottom: 4 }}>
            <span>{view.amtFmt}</span>
            <span>·</span>
            <span>{view.freq}</span>
            <span>·</span>
            <span>next {view.nextLabel}</span>
            {view.status === "manual" && <span style={{ color: "#2C6BFF", fontWeight: 700 }}>· Manually added</span>}
            {view.status === "needs_review" && <span style={{ color: "#F59E0B", fontWeight: 700 }}>· Needs review</span>}
          </div>
        </div>

        <div style={{ padding: "0 22px 8px", fontSize: 11.5, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", flexShrink: 0 }}>
          Transactions in this group ({matches.length})
        </div>

        <div style={{ overflowY: "auto", padding: "0 12px 20px" }}>
          {matches.length === 0 && (
            <div style={{ padding: "20px 10px", textAlign: "center", fontSize: 13, color: "#8A8A98" }}>No matching transactions found.</div>
          )}
          {matches.map((t) => {
            const row = txView(t, accounts, categories);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: row.iconBg,
                    color: row.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={row.icon} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "#8A8A98" }}>{row.sub}</div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: row.amountColor, flexShrink: 0 }}>{row.amountFmt}</div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 22px 20px", borderTop: "1px solid #F0F0F3", flexShrink: 0 }}>
          <button
            onClick={notASubscription}
            style={{
              width: "100%",
              height: 44,
              border: "1px solid #E6E6EB",
              borderRadius: 12,
              background: "#fff",
              color: "#8A8A98",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Not a subscription
          </button>
        </div>
      </div>
    </div>
  );
}
