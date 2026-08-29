"use client";

import { Icon } from "@/lib/kobo/icons";
import { naira } from "@/lib/kobo/format";
import { budgetsView } from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

export function BudgetsPage() {
  const { budgets, transactions, categories, budgetAlertThresholds, openBudget, deleteBudget } = useKobo();
  const views = budgetsView(budgets, transactions, categories, budgetAlertThresholds);
  const totAmt = views.reduce((a, b) => a + b.amount, 0);
  const totSpent = views.reduce((a, b) => a + b.spent, 0);
  const totPct = totAmt > 0 ? Math.round((totSpent / totAmt) * 100) + "%" : "0%";
  const totLeft = naira(Math.max(0, totAmt - totSpent));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", animation: "fadeUp .4s ease backwards" }}>
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
              background: "rgba(124,58,237,.32)",
              filter: "blur(45px)",
              top: -70,
              right: -40,
            }}
          />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, color: "#B7B7D4", fontWeight: 600 }}>Budgeted this month</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", marginTop: 6 }}>
              {naira(totSpent)} <span style={{ fontSize: 18, color: "#9A9AB0", fontWeight: 700 }}>/ {naira(totAmt)}</span>
            </div>
            <div style={{ height: 9, borderRadius: 6, background: "rgba(255,255,255,.14)", overflow: "hidden", marginTop: 16 }}>
              <div style={{ height: "100%", width: totPct, background: "linear-gradient(90deg,#2C6BFF,#5B8DFF)", borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 12.5, color: "#9EE7C0", marginTop: 10, fontWeight: 600 }}>{totLeft} left to spend</div>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>Stay ahead of overspending</div>
          <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 6, lineHeight: 1.5 }}>
            Carrot tracks every budget in real time and alerts you the moment you cross {budgetAlertThresholds.warn}% and{" "}
            {budgetAlertThresholds.over}% of a category limit.
          </div>
          <button
            onClick={openBudget}
            style={{
              marginTop: 18,
              alignSelf: "flex-start",
              height: 46,
              padding: "0 20px",
              border: "none",
              borderRadius: 13,
              background: "#2C6BFF",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="plus" size={17} strokeWidth={2.2} /> Create budget
          </button>
        </div>
      </div>
      {views.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No budgets yet</div>
          <div style={{ fontSize: 13, color: "#8A8A98" }}>Create one above to start tracking spend against a limit.</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {views.map((b) => (
          <div key={b.id} style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: b.iconBg,
                  color: b.catColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={b.icon} size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5 }}>{b.catName}</div>
                <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 1 }}>{b.statusLabel}</div>
              </div>
              <button
                onClick={() => deleteBudget(b.id)}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  background: "#F6F6F9",
                  borderRadius: 9,
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
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{b.spentFmt}</div>
              <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 700 }}>of {b.amtFmt}</div>
            </div>
            <div style={{ height: 10, borderRadius: 7, background: "#EFEFF3", overflow: "hidden" }}>
              <div style={{ height: "100%", width: b.barW, background: b.barColor, borderRadius: 7 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: b.barColor }}>{b.pct}% used</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
