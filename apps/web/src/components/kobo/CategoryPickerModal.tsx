"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

export function CategoryPickerModal() {
  const { categoryPickerTxId, closeCategoryPicker, categories, correctCat } = useKobo();
  const [search, setSearch] = useState("");
  const leaves = useMemo(() => categories.filter((c) => c.parent_id), [categories]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leaves;
    return leaves.filter((c) => c.name.toLowerCase().includes(q));
  }, [leaves, search]);

  if (!categoryPickerTxId) return null;

  function pick(catId: string) {
    correctCat(categoryPickerTxId!, catId);
    setSearch("");
    closeCategoryPicker();
  }

  function close() {
    setSearch("");
    closeCategoryPicker();
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
          maxWidth: 420,
          maxHeight: "min(600px, 80vh)",
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
          <div style={{ fontWeight: 800, fontSize: 16 }}>Change category</div>
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

        <div style={{ padding: "14px 22px 0", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 44,
              padding: "0 14px",
              border: "1.5px solid #E6E6EB",
              borderRadius: 12,
            }}
          >
            <Icon name="search" size={17} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "inherit",
                fontSize: 14,
                color: "#15171C",
              }}
            />
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "14px 12px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: "#8A8A98" }}>
              No categories match &quot;{search}&quot;
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 10px",
                border: "none",
                borderRadius: 12,
                background: "transparent",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                color: "#3A3A47",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: rgba(c.color, 0.14),
                  color: c.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={c.icon} size={16} />
              </span>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
