"use client";

import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { filteredTx, groupByDate, txView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

export function TransactionsPage() {
  const { accounts, transactions, categories, txSearch, setTxSearch, openCategoryPicker, flagAsSubscription } = useKobo();
  const [txAcc, setTxAcc] = useState("all");
  const [txCat, setTxCat] = useState("all");
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const leafCategories = categories.filter((c) => c.parent_id);

  const filtered = filteredTx(transactions, { acc: txAcc, cat: txCat, search: txSearch });
  const groups = groupByDate(filtered);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
      <div
        className="kb-mobsearch"
        style={{
          display: "none",
          alignItems: "center",
          gap: 11,
          height: 46,
          padding: "0 15px",
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #E6E6EB",
          color: "#8A8A98",
          marginBottom: 12,
        }}
      >
        <Icon name="search" size={18} />
        <input
          value={txSearch}
          onChange={(e) => setTxSearch(e.target.value)}
          placeholder="Search transactions"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: "inherit", fontSize: 15, color: "#15171C" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ id: "all", label: "All accounts" }, ...accounts.map((a) => ({ id: a.id, label: a.institution_name || a.name }))].map((a) => {
          const active = txAcc === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setTxAcc(a.id)}
              style={{
                height: 36,
                padding: "0 15px",
                border: "1px solid #E6E6EB",
                borderRadius: 11,
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: active ? "#15171C" : "#fff",
                color: active ? "#fff" : "#4A4A57",
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
        {[{ id: "all", name: "All", color: "#15171C" }, ...leafCategories].map((c) => {
          const active = txCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setTxCat(c.id)}
              style={{
                height: 32,
                padding: "0 13px",
                border: `1px solid ${active ? c.color : "#E6E6EB"}`,
                borderRadius: 20,
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: active ? rgba(c.color, 0.14) : "#fff",
                color: active ? c.color : "#4A4A57",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600, marginBottom: 10 }}>{filtered.length} transactions</div>

      {filtered.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 18, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No transactions found</div>
          <div style={{ fontSize: 13, color: "#8A8A98" }}>
            {transactions.length === 0 ? "Link an account to start seeing activity here." : "Try a different filter or search term."}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", margin: "18px 4px 8px" }}>
            {g.label}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 18, overflow: "hidden" }}>
            {g.items.map((t) => {
              const row = txView(t, accounts, categories);
              const editing = editTxId === t.id;
              return (
                <div key={t.id} style={{ borderBottom: "1px solid #F3F3F6" }}>
                  <div
                    onClick={() => setEditTxId(editing ? null : t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: row.iconBg,
                        color: row.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={row.icon} size={19} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.title}
                      </div>
                      <div className="kb-hidem" style={{ fontSize: 12, color: "#A0A0AC", marginTop: 3, fontFamily: "ui-monospace,monospace" }}>
                        {row.raw}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: row.amountColor }}>{row.amountFmt}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategoryPicker(t.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: row.iconBg,
                          color: row.iconColor,
                          padding: "3px 9px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {row.catName} <Icon name="chevD" size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                  {editing && (
                    <div style={{ padding: "4px 16px 16px", background: "#FAFAFC" }}>
                      {t.type === "expense" && (
                        <button
                          onClick={() => {
                            flagAsSubscription(t.id);
                            setEditTxId(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            height: 34,
                            padding: "0 12px",
                            marginTop: 10,
                            border: "1px dashed #C9C9D4",
                            borderRadius: 10,
                            background: "transparent",
                            fontFamily: "inherit",
                            fontWeight: 600,
                            fontSize: 12.5,
                            cursor: "pointer",
                            color: "#2C6BFF",
                          }}
                        >
                          <Icon name="refresh" size={15} />
                          Mark as subscription
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
