"use client";

import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { Subscription } from "@/lib/kobo/data";
import { monthlyRecurringTotal, subscriptionRowView, subscriptionsView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";
import { SubscriptionDetailModal } from "@/components/kobo/SubscriptionDetailModal";

export function SubscriptionsPage() {
  const { subscriptions, categories, accounts, dismissSubscription } = useKobo();
  const [subsAcc, setSubsAcc] = useState("all");
  const [openSub, setOpenSub] = useState<Subscription | null>(null);

  const scoped = subsAcc === "all" ? subscriptions : subscriptions.filter((s) => s.account_id === subsAcc);

  const sorted = [...scoped].sort((a, b) => {
    if (!a.predicted_next_charge_at) return 1;
    if (!b.predicted_next_charge_at) return -1;
    return a.predicted_next_charge_at.localeCompare(b.predicted_next_charge_at);
  });
  const active = subscriptionsView(sorted, categories);
  const recurTotal = monthlyRecurringTotal(scoped);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", animation: "fadeUp .4s ease backwards" }}>
      {accounts.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ id: "all", label: "All accounts" }, ...accounts.map((a) => ({ id: a.id, label: a.institution_name || a.name }))].map((a) => {
            const isActive = subsAcc === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSubsAcc(a.id)}
                style={{
                  height: 36,
                  padding: "0 15px",
                  border: "1px solid #E6E6EB",
                  borderRadius: 11,
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  background: isActive ? "#15171C" : "#fff",
                  color: isActive ? "#fff" : "#4A4A57",
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20, marginBottom: 20 }}>
        <div
          style={{
            background: "linear-gradient(135deg,#14141E,#2A2566)",
            borderRadius: 22,
            padding: 24,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(91,141,255,.3)",
              filter: "blur(45px)",
              top: -70,
              right: -40,
            }}
          />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, color: "#B7B7D4", fontWeight: 600 }}>Recurring this month</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", marginTop: 6 }}>{recurTotal}</div>
            <div style={{ fontSize: 12.5, color: "#9EE7C0", marginTop: 10, fontWeight: 600 }}>
              across {active.length} subscription{active.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>Detected automatically</div>
          <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 6, lineHeight: 1.5 }}>
            Carrot watches your transaction history for charges that repeat on a regular schedule and lists them here — no
            setup needed. Not one of yours? Mark it "Not a subscription" and it won't come back.
          </div>
        </div>
      </div>

      {active.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {subsAcc !== "all" ? "No subscriptions on this account" : "No subscriptions detected yet"}
          </div>
          <div style={{ fontSize: 13, color: "#8A8A98", maxWidth: 380, margin: "0 auto" }}>
            {subsAcc !== "all"
              ? "Try clearing the account filter, or check another account."
              : "Subscriptions build up automatically once a charge repeats on the same account — link an account and sync a few months of history, or flag one manually from the Transactions page."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {active.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              const sub = sorted.find((x) => x.id === s.id);
              if (sub) setOpenSub(sub);
            }}
            style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, padding: 20, cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: s.iconBg,
                  color: s.iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={s.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 1 }}>
                  {s.freq} · next {s.nextLabel}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{s.amtFmt}</div>
              {s.status === "manual" && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2C6BFF" }}>Manually added</span>
              )}
              {s.status === "needs_review" && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>Needs review</span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissSubscription(s.id);
              }}
              style={{
                width: "100%",
                height: 38,
                border: "1px solid #E6E6EB",
                borderRadius: 11,
                background: "#fff",
                color: "#8A8A98",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Not a subscription
            </button>
          </div>
        ))}
      </div>

      {openSub && <SubscriptionDetailModal subscription={openSub} onClose={() => setOpenSub(null)} />}
    </div>
  );
}
