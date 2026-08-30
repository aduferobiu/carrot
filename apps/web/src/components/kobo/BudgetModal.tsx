"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

export function BudgetModal() {
  const { budgetModal, budgetCat, budgetAmt, categories, closeBudget, setBudgetCat, setBudgetAmt, saveBudget } = useKobo();
  const [catSearch, setCatSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const leafCategories = useMemo(() => categories.filter((c) => c.parent_id), [categories]);
  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return leafCategories;
    return leafCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [leafCategories, catSearch]);
  const selectedCategory = leafCategories.find((c) => c.id === budgetCat) ?? null;
  if (!budgetModal) return null;

  function pick(catId: string) {
    setBudgetCat(catId);
    setCatSearch("");
    setCatOpen(false);
  }

  return (
    <div
      onClick={closeBudget}
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
          background: "#fff",
          borderRadius: 24,
          animation: "pop .2s ease both",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
        }}
      >
        <div className="kb-grab" style={{ display: "none", width: 38, height: 4, borderRadius: 3, background: "#D8D8E0", margin: "10px auto 0" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px",
            borderBottom: "1px solid #F0F0F3",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>Create budget</div>
          <button
            onClick={closeBudget}
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
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6F7B", marginBottom: 10 }}>Category</div>
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 42,
                padding: "0 13px",
                border: `1.5px solid ${catOpen ? "#2C6BFF" : "#E6E6EB"}`,
                borderRadius: 12,
              }}
            >
              {selectedCategory && !catOpen ? (
                <span style={{ color: selectedCategory.color, display: "flex" }}>
                  <Icon name={selectedCategory.icon} size={16} />
                </span>
              ) : (
                <Icon name="search" size={16} />
              )}
              <input
                value={catOpen ? catSearch : selectedCategory?.name ?? ""}
                onFocus={() => {
                  setCatOpen(true);
                  setCatSearch("");
                }}
                onChange={(e) => setCatSearch(e.target.value)}
                onBlur={() => setCatOpen(false)}
                placeholder="Search categories"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#15171C" }}
              />
            </div>
            {catOpen && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  maxHeight: 220,
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #E6E6EB",
                  borderRadius: 14,
                  boxShadow: "0 14px 40px rgba(0,0,0,.12)",
                  padding: 6,
                  zIndex: 5,
                }}
              >
                {filteredCategories.length === 0 && (
                  <div style={{ padding: "10px 10px", fontSize: 13, color: "#8A8A98" }}>No categories match &quot;{catSearch}&quot;</div>
                )}
                {filteredCategories.map((c) => {
                  const sel = budgetCat === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => pick(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        width: "100%",
                        padding: "9px 10px",
                        border: "none",
                        borderRadius: 10,
                        background: sel ? rgba(c.color, 0.12) : "transparent",
                        fontFamily: "inherit",
                        fontWeight: 600,
                        fontSize: 13.5,
                        cursor: "pointer",
                        color: sel ? c.color : "#3A3A47",
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
                        <Icon name={c.icon} size={15} />
                      </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6F7B", margin: "18px 0 10px" }}>Monthly limit</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 54,
              padding: "0 16px",
              border: "1.5px solid #E6E6EB",
              borderRadius: 14,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 800, color: "#8A8A98" }}>₦</span>
            <input
              value={budgetAmt}
              onChange={(e) => setBudgetAmt(e.target.value)}
              inputMode="numeric"
              placeholder="30,000"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "inherit",
                fontSize: 18,
                fontWeight: 700,
                color: "#15171C",
              }}
            />
          </div>
          <button
            onClick={saveBudget}
            style={{
              marginTop: 20,
              width: "100%",
              height: 52,
              border: "none",
              borderRadius: 14,
              background: "#2C6BFF",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Save budget
          </button>
        </div>
      </div>
    </div>
  );
}
