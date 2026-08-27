"use client";

import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

export function BudgetModal() {
  const { budgetModal, budgetCat, budgetAmt, categories, closeBudget, setBudgetCat, setBudgetAmt, saveBudget } = useKobo();
  if (!budgetModal) return null;
  const leafCategories = categories.filter((c) => c.parent_id);

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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 148, overflowY: "auto" }}>
            {leafCategories.map((c) => {
              const sel = budgetCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setBudgetCat(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    height: 36,
                    padding: "0 12px",
                    border: `1.5px solid ${sel ? c.color : "#E6E6EB"}`,
                    borderRadius: 11,
                    background: sel ? rgba(c.color, 0.14) : "#fff",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                    color: "#3A3A47",
                  }}
                >
                  <span style={{ color: c.color }}>
                    <Icon name={c.icon} size={18} />
                  </span>
                  {c.name}
                </button>
              );
            })}
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
