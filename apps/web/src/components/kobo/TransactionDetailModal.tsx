"use client";

import { Icon } from "@/lib/kobo/icons";
import { naira, dateLabel, timeLabel } from "@/lib/kobo/format";
import { accById, catById, parseCounterparty, txView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

const TYPE_LABEL = { income: "Income", expense: "Expense", transfer: "Transfer" } as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid #F0F0F3" }}>
      <span style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#15171C", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PartyCard({
  label,
  name,
  sub,
  badge,
}: {
  label: string;
  name: string;
  sub: string;
  badge?: { text: string; color: string; bg: string };
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "#FAFAFC", border: "1px solid #F0F0F3", borderRadius: 14, padding: "12px 13px" }}>
      <div style={{ fontSize: 10.5, color: "#8A8A98", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#15171C", overflowWrap: "break-word" }}>{name}</div>
      <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 2 }}>{sub}</div>
      {badge && (
        <div
          style={{
            display: "inline-flex",
            marginTop: 8,
            padding: "3px 9px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.text}
        </div>
      )}
    </div>
  );
}

export function TransactionDetailModal() {
  const { txDetailId, closeTxDetail, transactions, accounts, categories, openCategoryPicker, flagAsSubscription } = useKobo();
  const t = transactions.find((x) => x.id === txDetailId);

  if (!txDetailId || !t) return null;

  const row = txView(t, accounts, categories);
  const account = accById(accounts, t.account_id);
  const category = catById(categories, t.category_id);
  const counterparty = parseCounterparty(t.raw_description);
  const isIncome = t.type === "income";

  const youCard = (
    <PartyCard
      label="You"
      name={account.institution_name || account.name}
      sub={account.masked_number || account.name}
      badge={{
        text: isIncome ? "Received" : "Sent",
        color: isIncome ? "#12B76A" : "#E11D48",
        bg: isIncome ? "rgba(18,183,106,.12)" : "rgba(225,29,72,.12)",
      }}
    />
  );
  const otherCard = counterparty && (
    <PartyCard label={isIncome ? "Sender" : "Receiver"} name={counterparty.name} sub={counterparty.bank || "Bank not available"} />
  );

  function close() {
    closeTxDetail();
  }

  return (
    <div
      onClick={close}
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
          maxWidth: 440,
          maxHeight: "min(680px, 85vh)",
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
          <div style={{ fontWeight: 800, fontSize: 16 }}>Transaction details</div>
          <button
            onClick={close}
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

        <div style={{ overflowY: "auto", padding: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: row.iconBg,
                color: row.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={row.icon} size={24} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: row.amountColor }}>{row.amountFmt}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}>{row.title}</div>
          </div>

          {counterparty && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600, marginBottom: 8 }}>Sender &amp; receiver</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isIncome ? otherCard : youCard}
                <Icon name="swap" size={15} />
                {isIncome ? youCard : otherCard}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <Row label="Type" value={TYPE_LABEL[t.type]} />
            <Row label="Date" value={dateLabel(t.occurred_at)} />
            <Row label="Time" value={timeLabel(t.occurred_at)} />
            <Row label="Account" value={account.institution_name || account.name} />
            <Row label="Amount" value={naira(t.amount)} />
          </div>

          <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600, marginBottom: 8 }}>Category</div>
          <button
            onClick={() => {
              close();
              openCategoryPicker(t.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "11px 14px",
              border: "1px solid #E6E6EB",
              borderRadius: 13,
              background: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: row.iconBg,
                color: row.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={category.icon} size={15} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1, textAlign: "left" }}>{row.catName}</span>
            <Icon name="chevD" size={14} strokeWidth={2.2} />
          </button>

          <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600, marginBottom: 8 }}>Raw bank narration</div>
          <div
            style={{
              padding: "11px 14px",
              background: "#FAFAFC",
              border: "1px solid #F0F0F3",
              borderRadius: 13,
              fontSize: 12,
              fontFamily: "ui-monospace,monospace",
              color: "#4A4A57",
              lineHeight: 1.5,
              wordBreak: "break-word",
              marginBottom: t.type === "expense" ? 18 : 0,
            }}
          >
            {t.raw_description || "—"}
          </div>

          {t.type === "expense" && (
            <button
              onClick={() => {
                flagAsSubscription(t.id);
                close();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                width: "100%",
                height: 42,
                border: "1px dashed #C9C9D4",
                borderRadius: 12,
                background: "transparent",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                color: "#2C6BFF",
              }}
            >
              <Icon name="refresh" size={15} />
              Mark as subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
