"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { sortedTx, txView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

export function AddSubscriptionModal({ onClose }: { onClose: () => void }) {
  const { accounts, transactions, categories, createManualSubscription } = useKobo();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function pickAccount(id: string) {
    setAccountId(id);
    setSelected([]);
  }

  const pool = useMemo(
    () => sortedTx(transactions.filter((t) => t.account_id === accountId && t.type === "expense")),
    [transactions, accountId],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((t) => ((t.description ?? "") + " " + (t.raw_description ?? "")).toLowerCase().includes(q));
  }, [pool, search]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    if (!accountId || selected.length === 0) return;
    createManualSubscription(accountId, selected);
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
          maxHeight: "min(680px, 84vh)",
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
          <div style={{ fontWeight: 800, fontSize: 16 }}>Add subscription</div>
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

        {accounts.length === 0 ? (
          <div style={{ padding: "32px 22px", textAlign: "center", fontSize: 13, color: "#8A8A98" }}>
            Link an account first to pick transactions from it.
          </div>
        ) : (
          <>
            {accounts.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 22px 0", flexShrink: 0 }}>
                {accounts.map((a) => {
                  const checked = accountId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => pickAccount(a.id)}
                      style={{
                        height: 32,
                        padding: "0 13px",
                        border: `1px solid ${checked ? "#15171C" : "#E6E6EB"}`,
                        borderRadius: 18,
                        fontFamily: "inherit",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        background: checked ? "#15171C" : "#fff",
                        color: checked ? "#fff" : "#4A4A57",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.institution_name || a.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ padding: "14px 22px 0", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 42,
                  padding: "0 13px",
                  border: "1.5px solid #E6E6EB",
                  borderRadius: 12,
                }}
              >
                <Icon name="search" size={16} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transactions"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#15171C" }}
                />
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "10px 12px 20px" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: "#8A8A98" }}>
                  {pool.length === 0 ? "No expense transactions on this account." : `No transactions match "${search}"`}
                </div>
              )}
              {filtered.map((t) => {
                const row = txView(t, accounts, categories);
                const checked = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "9px 10px",
                      border: "none",
                      borderRadius: 12,
                      background: checked ? "#F2F2F5" : "transparent",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
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
                      <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 1 }}>{row.sub}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{row.amountFmt}</div>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `1.5px solid ${checked ? "#15171C" : "#D5D5DC"}`,
                        background: checked ? "#15171C" : "transparent",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {checked && <Icon name="check" size={13} strokeWidth={2.6} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "14px 22px 20px", borderTop: "1px solid #F0F0F3", flexShrink: 0 }}>
              <button
                onClick={submit}
                disabled={selected.length === 0}
                style={{
                  width: "100%",
                  height: 48,
                  border: "none",
                  borderRadius: 13,
                  background: selected.length > 0 ? "#2C6BFF" : "#E6E6EB",
                  color: selected.length > 0 ? "#fff" : "#A0A0AC",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: selected.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Add subscription{selected.length > 0 ? ` (${selected.length})` : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
