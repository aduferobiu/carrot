"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartBar } from "@/components/kobo/ChartBar";
import { Icon } from "@/lib/kobo/icons";
import { naira } from "@/lib/kobo/format";
import { useElementHeight } from "@/lib/kobo/useElementHeight";
import {
  cashflowBars,
  donutGradient,
  monthlyCashflow,
  monthlyRecurringTotal,
  spendByCat,
  subscriptionsView,
  topCategories,
} from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: "26px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#C4C4CE" }}>
      <Icon name={icon} size={22} />
      <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600, textAlign: "center" }}>{text}</div>
    </div>
  );
}

export function InsightsPage() {
  const router = useRouter();
  const { transactions, categories, subscriptions, accounts } = useKobo();
  const [insightsAcc, setInsightsAcc] = useState("all");
  const scopedTx = insightsAcc === "all" ? transactions : transactions.filter((t) => t.account_id === insightsAcc);
  const scopedSubs = insightsAcc === "all" ? subscriptions : subscriptions.filter((s) => s.account_id === insightsAcc);
  const spend = spendByCat(scopedTx, categories);
  const topCats = topCategories(spend, categories);
  const totSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const cashflowData = monthlyCashflow(scopedTx);
  const hasCashflow = cashflowData.some((c) => c.cred > 0 || c.deb > 0);
  const [barsRef, barsRowHeight] = useElementHeight<HTMLDivElement>();
  const barsMaxPx = Math.max(40, barsRowHeight - 36);
  const cashflow = cashflowBars(cashflowData, barsMaxPx);
  const recurring = subscriptionsView(scopedSubs, categories);
  const recurTotal = monthlyRecurringTotal(scopedSubs);

  const topTiles = topCats.slice(0, 3);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", animation: "fadeUp .4s ease backwards" }}>
      {accounts.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ id: "all", label: "All accounts" }, ...accounts.map((a) => ({ id: a.id, label: a.institution_name || a.name }))].map((a) => {
            const active = insightsAcc === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setInsightsAcc(a.id)}
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
      )}

      {topTiles.length > 0 && (
        <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          {topTiles.map((c) => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 13 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: c.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={c.icon} size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{c.fmt}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Cashflow</div>
              <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>Money in vs out · 6 months</div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6B6F7B" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#12B76A" }} /> In
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6B6F7B" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#E11D48" }} /> Out
              </div>
            </div>
          </div>
          {hasCashflow ? (
            <div ref={barsRef} style={{ display: "flex", alignItems: "flex-end", gap: 16, flex: 1, minHeight: 186 }}>
              {cashflow.map((c) => (
                <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                    <ChartBar height={c.credH} color="linear-gradient(#19D88A,#12B76A)" label={`In: ${c.credFmt}`} width={17} />
                    <ChartBar height={c.debH} color="linear-gradient(#FB5572,#E11D48)" label={`Out: ${c.debFmt}`} width={17} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A98" }}>{c.m}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 186, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#C4C4CE" }}>
              <Icon name="chart" size={26} />
              <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600 }}>No transaction history yet</div>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>By category</div>
          <div style={{ fontSize: 12.5, color: "#8A8A98", marginBottom: 18 }}>{naira(totSpend)} this month</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ position: "relative", width: 150, height: 150 }}>
              <div style={{ width: 150, height: 150, borderRadius: "50%", background: donutGradient(spend, categories) }} />
              <div
                style={{
                  position: "absolute",
                  inset: 20,
                  background: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 11, color: "#8A8A98", fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{naira(totSpend)}</div>
              </div>
            </div>
          </div>
          {topCats.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#8A8A98", textAlign: "center" }}>No spending yet this month</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {topCats.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#8A8A98" }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: "8px 8px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#2C6BFF" }}>
                  <Icon name="sparkles" size={18} />
                </span>
                Recurring transactions
              </div>
              <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 3 }}>
                Detected from your transaction history · {recurTotal}/month
              </div>
            </div>
            <span onClick={() => router.push("/subscriptions")} style={{ fontSize: 13, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}>
              See all
            </span>
          </div>
          {recurring.length === 0 && (
            <div style={{ padding: "8px 16px 18px", fontSize: 13, color: "#8A8A98" }}>
              Nothing recurring detected yet — subscriptions build up automatically as charges repeat.
            </div>
          )}
          <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {recurring.slice(0, 4).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderRadius: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    background: r.iconBg,
                    color: r.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={r.icon} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 2 }}>
                    {r.freq} · next {r.nextLabel}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{r.amtFmt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
