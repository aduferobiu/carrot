"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { Account, Category } from "@/lib/kobo/data";

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function TransactionFilterDrawer({
  open,
  onClose,
  accounts,
  categories,
  appliedAccs,
  appliedCats,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  appliedAccs: string[];
  appliedCats: string[];
  onApply: (accs: string[], cats: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  // Local, unapplied staging state — the drawer only edits this until "Apply
  // filters" commits it. Re-synced from the applied filters every time the
  // drawer opens, so closing without applying (X, overlay click) discards
  // whatever was toggled, and reopening after a previous Apply reflects it.
  const [pendingAccs, setPendingAccs] = useState<string[]>(appliedAccs);
  const [pendingCats, setPendingCats] = useState<string[]>(appliedCats);

  useEffect(() => {
    if (open) {
      setPendingAccs(appliedAccs);
      setPendingCats(appliedCats);
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const leaves = useMemo(() => categories.filter((c) => c.parent_id), [categories]);
  const parents = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? leaves.filter((c) => c.name.toLowerCase().includes(q)) : leaves;
    const byParent = new Map<string, Category[]>();
    list.forEach((c) => {
      const key = c.parent_id!;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    });
    return parents.map((p) => ({ parent: p, items: byParent.get(p.id) ?? [] })).filter((g) => g.items.length > 0);
  }, [leaves, parents, search]);

  if (!open) return null;

  const pendingCount = pendingAccs.length + pendingCats.length;
  const hasPending = pendingCount > 0;

  function apply() {
    onApply(pendingAccs, pendingCats);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,10,16,.28)", zIndex: 40 }} />
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
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800 }}>Filters</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {hasPending && (
              <span
                onClick={() => {
                  setPendingAccs([]);
                  setPendingCats([]);
                }}
                style={{ fontSize: 12.5, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}
              >
                Clear
              </span>
            )}
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
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
            Account
          </div>
          <div style={{ fontSize: 11.5, color: "#B0B0BC", marginBottom: 8 }}>Select one or more</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 26 }}>
            {accounts.map((a) => {
              const label = a.institution_name || a.name;
              const checked = pendingAccs.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => setPendingAccs((prev) => toggle(prev, a.id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 44,
                    padding: "0 12px",
                    border: "none",
                    borderRadius: 12,
                    background: checked ? "#F2F2F5" : "transparent",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    color: checked ? "#15171C" : "#4A4A57",
                    textAlign: "left",
                  }}
                >
                  {label}
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

          <div style={{ fontSize: 12, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
            Category
          </div>
          <div style={{ fontSize: 11.5, color: "#B0B0BC", marginBottom: 8 }}>Select one or more</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 13px",
              border: "1.5px solid #E6E6EB",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#15171C" }}
            />
          </div>

          {grouped.length === 0 && (
            <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 13, color: "#8A8A98" }}>
              No categories match &quot;{search}&quot;
            </div>
          )}
          {grouped.map(({ parent, items }) => (
            <div key={parent.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#B0B0BC", padding: "8px 12px 2px" }}>{parent.name}</div>
              {items.map((c) => {
                const checked = pendingCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setPendingCats((prev) => toggle(prev, c.id))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      width: "100%",
                      padding: "9px 12px",
                      border: "none",
                      borderRadius: 12,
                      background: checked ? rgba(c.color, 0.12) : "transparent",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: "pointer",
                      color: checked ? c.color : "#3A3A47",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: rgba(c.color, 0.14),
                        color: c.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={c.icon} size={14} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `1.5px solid ${checked ? c.color : "#D5D5DC"}`,
                        background: checked ? c.color : "transparent",
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
          ))}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #EEE", flexShrink: 0 }}>
          <button
            onClick={apply}
            style={{
              width: "100%",
              height: 48,
              border: "none",
              borderRadius: 14,
              background: "#2C6BFF",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14.5,
              cursor: "pointer",
            }}
          >
            Apply filters{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}
