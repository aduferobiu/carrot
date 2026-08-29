"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChartBar } from "@/components/kobo/ChartBar";
import { Icon } from "@/lib/kobo/icons";
import { HealthScore } from "@/lib/kobo/data";
import { currentMonthStart, monthLabel, naira, rgba } from "@/lib/kobo/format";
import { useElementHeight } from "@/lib/kobo/useElementHeight";
import {
  budgetsView,
  cashflowBars,
  donutGradient,
  monthlyCashflow,
  monthlyRecurringTotal,
  monthTotals,
  sortedTx,
  spendByCat,
  subscriptionsView,
  topCategories,
  txView,
} from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

type Layout = "overview" | "analytics";

const TABS: [Layout, string][] = [
  ["overview", "Overview"],
  ["analytics", "Analytics"],
];

function bandColor(band: string): string {
  switch (band) {
    case "Excellent":
      return "#059669";
    case "Good":
      return "#12B76A";
    case "Fair":
      return "#F59E0B";
    default:
      return "#EF4444";
  }
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: "26px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#C4C4CE" }}>
      <Icon name={icon} size={22} />
      <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600, textAlign: "center" }}>{text}</div>
    </div>
  );
}

function HealthScoreCard({ healthScore, onClick }: { healthScore: HealthScore | null; onClick: () => void }) {
  if (!healthScore || healthScore.notEnoughData) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 6 }}>Financial health</div>
        <div style={{ fontSize: 13, color: "#8A8A98" }}>
          {healthScore ? "Not enough data yet — check back after a week of activity." : "Calculating your score…"}
        </div>
      </div>
    );
  }
  const color = bandColor(healthScore.band);
  return (
    <div
      onClick={onClick}
      style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800 }}>Financial health</div>
        <span style={{ color: "#8A8A98" }}>
          <Icon name="shield" size={18} />
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em" }}>{healthScore.score}</div>
          <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600 }}>/ 100</div>
        </div>
        <div
          style={{
            display: "inline-flex",
            padding: "5px 11px",
            borderRadius: 9,
            fontSize: 12.5,
            fontWeight: 700,
            background: rgba(color, 0.12),
            color,
          }}
        >
          {healthScore.band}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 10 }}>Tap to see the breakdown</div>
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const {
    accounts,
    transactions,
    budgets,
    categories,
    subscriptions,
    healthScore,
    installDismissed,
    dismissInstall,
    openLink,
    refreshAll,
    toggleHealthModal,
    openTxDetail,
    budgetAlertThresholds,
  } = useKobo();
  const [dashLayout, setDashLayout] = useState<Layout>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }

  const monthStart = currentMonthStart();
  const total = accounts.reduce((a, b) => a + b.balance, 0);
  const { monthIn, monthOut, net } = monthTotals(transactions, monthStart);
  const deltaFmt = (net >= 0 ? "+" : "–") + naira(Math.abs(net));
  const netFmt = deltaFmt;

  const recentTx = sortedTx(transactions).slice(0, 6).map((t) => txView(t, accounts, categories));
  const spend = spendByCat(transactions, categories);
  const topCats = topCategories(spend, categories);
  const totSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const budgetsTop = budgetsView(budgets, transactions, categories, budgetAlertThresholds).slice(0, 3);
  const cashflowData = monthlyCashflow(transactions);
  const hasCashflow = cashflowData.some((c) => c.cred > 0 || c.deb > 0);
  const [barsRef, barsRowHeight] = useElementHeight<HTMLDivElement>();
  const barsMaxPx = Math.max(40, barsRowHeight - 36);
  const cashflow = cashflowBars(cashflowData, barsMaxPx);
  const recurring = subscriptionsView(subscriptions, categories);
  const recurTotal = monthlyRecurringTotal(subscriptions);

  // In-vs-out ratio donut for the month (2 segments), not a per-month split.
  const inOutTotal = monthIn + monthOut;
  const inPct = inOutTotal > 0 ? (monthIn / inOutTotal) * 100 : 0;
  const inOutDonut =
    inOutTotal > 0 ? `conic-gradient(#12B76A 0% ${inPct.toFixed(1)}%, #E11D48 ${inPct.toFixed(1)}% 100%)` : "#2A2960";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .4s ease backwards" }}>
      {!installDismissed && (
        <div
          className="kb-installbar"
          style={{
            display: "none",
            alignItems: "center",
            gap: 12,
            background: "#15151F",
            color: "#fff",
            borderRadius: 18,
            padding: "13px 14px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#2C6BFF,#5B8DFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            ◈
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Install Carrot</div>
            <div style={{ fontSize: 11.5, color: "#A9A9C4", marginTop: 1 }}>Add to home screen for instant access</div>
          </div>
          <button
            onClick={dismissInstall}
            style={{
              height: 34,
              padding: "0 13px",
              border: "none",
              borderRadius: 10,
              background: "#2C6BFF",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      )}

      <div className="kb-dashbar" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div className="kb-seg" style={{ display: "flex", gap: 4, padding: 4, background: "#fff", border: "1px solid #E6E6EB", borderRadius: 12 }}>
          {TABS.map(([id, label]) => {
            const isActive = dashLayout === id;
            return (
              <button
                key={id}
                className="kb-segbtn"
                onClick={() => setDashLayout(id)}
                style={{
                  height: 34,
                  padding: "0 16px",
                  border: "none",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  background: isActive ? "#15171C" : "transparent",
                  color: isActive ? "#fff" : "#6B6F7B",
                  transition: "all .15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div className="kb-dashbar-actions kb-hidem" style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            style={{
              width: 40,
              height: 40,
              border: "1px solid #E6E6EB",
              borderRadius: 12,
              background: "#fff",
              color: "#4A4A57",
              cursor: refreshing ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ display: "flex", animation: refreshing ? "spin .8s linear infinite" : "none" }}>
              <Icon name="refresh" size={16} />
            </span>
          </button>
          <button
            onClick={openLink}
            style={{
              height: 40,
              padding: "0 16px",
              border: "none",
              borderRadius: 12,
              background: "#2C6BFF",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Icon name="plus" size={15} strokeWidth={2.2} />
            Link account
          </button>
        </div>
      </div>

      {/* Mobile-only: the actions above sit cramped next to the tab switcher on a
         narrow screen, so on mobile they're hidden (see .kb-dashbar-actions in
         kobo.css) and replaced with this fixed bar pinned above the bottom nav —
         same actions, but "Link account" reads as the primary CTA it actually is. */}
      <div className="kb-dashcta">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh"
          style={{
            width: 52,
            height: 52,
            border: "1px solid #E6E6EB",
            borderRadius: 16,
            background: "#fff",
            color: "#4A4A57",
            cursor: refreshing ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 8px 20px rgba(21,23,28,.12)",
          }}
        >
          <span style={{ display: "flex", animation: refreshing ? "spin .8s linear infinite" : "none" }}>
            <Icon name="refresh" size={19} />
          </span>
        </button>
        <button
          onClick={openLink}
          style={{
            flex: 1,
            height: 52,
            border: "none",
            borderRadius: 16,
            background: "#2C6BFF",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 8px 20px rgba(44,107,255,.35)",
          }}
        >
          <Icon name="plus" size={17} strokeWidth={2.2} />
          Link account
        </button>
      </div>

      {dashLayout === "overview" && (
        <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              className="kb-herocard"
              style={{
                background: "linear-gradient(135deg,#14141E 0%,#1E1C3A 52%,#2E2768 100%)",
                borderRadius: 24,
                padding: "28px 28px 28px 40px",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: "rgba(91,141,255,.30)",
                  filter: "blur(50px)",
                  top: -90,
                  right: -40,
                }}
              />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 13, color: "#B7B7D4", fontWeight: 600 }}>Total balance · {monthLabel(monthStart)}</div>
                      <button
                        onClick={() => setShowBalance((v) => !v)}
                        aria-label={showBalance ? "Hide balance" : "Show balance"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          color: "#B7B7D4",
                          cursor: "pointer",
                        }}
                      >
                        <Icon name={showBalance ? "eye" : "eyeOff"} size={15} />
                      </button>
                    </div>
                    <div className="kb-hero" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.025em", marginTop: 7, lineHeight: 1 }}>
                      {showBalance ? naira(total) : "₦ •••"}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 13,
                        background: "rgba(124,242,176,.14)",
                        color: "#7CF2B0",
                        padding: "5px 11px",
                        borderRadius: 9,
                        fontSize: 12.5,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Icon name="upRight" size={15} strokeWidth={2.2} /> {deltaFmt} net this month
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: "8px 8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 10px" }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Recent activity</div>
                <span onClick={() => router.push("/transactions")} style={{ fontSize: 13, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}>
                  See all
                </span>
              </div>
              {recentTx.length === 0 ? (
                <EmptyState icon="list" text="No transactions yet" />
              ) : (
                recentTx.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTxDetail(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 14, cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: t.iconBg,
                        color: t.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={t.icon} size={19} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#8A8A98", marginTop: 2 }}>{t.sub}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: t.amountColor, whiteSpace: "nowrap" }}>{t.amountFmt}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <HealthScoreCard healthScore={healthScore} onClick={toggleHealthModal} />

            <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 6 }}>Spending this month</div>
              <div style={{ fontSize: 12.5, color: "#8A8A98", marginBottom: 18 }}>
                {naira(totSpend)} across {topCats.length} categories
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
                  <div style={{ width: 140, height: 140, borderRadius: "50%", background: donutGradient(spend, categories) }} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 18,
                      background: "#fff",
                      borderRadius: "50%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#8A8A98", fontWeight: 600 }}>Top</div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{topCats[0]?.name.split(" ")[0] ?? "—"}</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
                  {topCats.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: "#8A8A98" }}>No spending yet this month</div>
                  ) : (
                    topCats.slice(0, 3).map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{c.pct}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Budgets</div>
                <span onClick={() => router.push("/budgets")} style={{ fontSize: 13, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}>
                  Manage
                </span>
              </div>
              {budgetsTop.length === 0 ? (
                <EmptyState icon="target" text="No budgets yet — tap Manage to create one" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {budgetsTop.map((b) => (
                    <div key={b.id}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.catName}</div>
                        <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600 }}>
                          {b.spentFmt} / {b.amtFmt}
                        </div>
                      </div>
                      <div style={{ height: 8, borderRadius: 6, background: "#EFEFF3", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: b.barW, background: b.barColor, borderRadius: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dashLayout === "analytics" && (
        <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Cashflow</div>
                <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>Credits vs debits · last 6 months</div>
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
              <div ref={barsRef} style={{ display: "flex", alignItems: "flex-end", gap: 14, flex: 1, minHeight: 186 }}>
                {cashflow.map((c) => (
                  <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
                      <ChartBar height={c.credH} color="linear-gradient(#19D88A,#12B76A)" label={`In: ${c.credFmt}`} />
                      <ChartBar height={c.debH} color="linear-gradient(#FB5572,#E11D48)" label={`Out: ${c.debFmt}`} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8A98" }}>{c.m}</div>
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
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>Spending trend</div>

            <div style={{ display: "flex", justifyContent: "center", margin: "18px 0" }}>
              <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
                <div style={{ width: 128, height: 128, borderRadius: "50%", background: inOutDonut }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 18,
                    background: "#fff",
                    borderRadius: "50%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 9.5, color: "#8A8A98", fontWeight: 600 }}>Net</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#15171C" }}>{netFmt}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6B6F7B" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#12B76A" }} /> In
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6B6F7B" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#E11D48" }} /> Out
              </div>
            </div>

            <div style={{ paddingTop: 16, borderTop: "1px solid #F0F0F3" }}>
              <div style={{ fontSize: 12, color: "#8A8A98", fontWeight: 600 }}>Net this month</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4, color: "#15171C" }}>{netFmt}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                <div style={{ flex: 1, background: "#F2FBF6", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11.5, color: "#0E9E6A", fontWeight: 700 }}>In</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: "#0E7A52" }}>{naira(monthIn)}</div>
                </div>
                <div style={{ flex: 1, background: "#FEF3F2", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11.5, color: "#DC2626", fontWeight: 700 }}>Out</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: "#B42318" }}>{naira(monthOut)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 24 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 18 }}>Spending by category</div>
            {topCats.length === 0 ? (
              <EmptyState icon="grid" text="No spending yet this month" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {topCats.map((c) => (
                  <div key={c.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: c.color }}>
                          <Icon name={c.icon} size={18} />
                        </span>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 700 }}>{c.fmt}</div>
                    </div>
                    <div style={{ height: 7, borderRadius: 5, background: "#EFEFF3", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: c.barW, background: c.color, borderRadius: 5 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: "8px 8px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px" }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Recurring</div>
                <div style={{ fontSize: 11.5, color: "#8A8A98", marginTop: 2 }}>Detected from your transaction history</div>
              </div>
              <span onClick={() => router.push("/subscriptions")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2C6BFF", cursor: "pointer" }}>
                {recurTotal}/mo
              </span>
            </div>
            {recurring.length === 0 && (
              <div style={{ padding: "8px 16px 18px", fontSize: 13, color: "#8A8A98" }}>
                Nothing recurring detected yet — subscriptions build up automatically as charges repeat.
              </div>
            )}
            {recurring.slice(0, 5).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
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
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: "#8A8A98", marginTop: 1 }}>
                    {r.freq} · next {r.nextLabel}
                    {r.status === "needs_review" ? " · needs review" : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>{r.amtFmt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
