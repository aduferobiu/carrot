"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChartBar } from "@/components/kobo/ChartBar";
import { Icon } from "@/lib/kobo/icons";
import { accountCode, accountGradient, HealthScore } from "@/lib/kobo/data";
import { currentMonthStart, monthLabel, naira, rgba } from "@/lib/kobo/format";
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
  trendBars,
  txView,
} from "@/lib/kobo/selectors";
import { useKobo } from "@/lib/kobo/store";

type Layout = "overview" | "cards" | "analytics";

const TABS: [Layout, string][] = [
  ["overview", "Overview"],
  ["cards", "Cards"],
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em" }}>{healthScore.score}</div>
        <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600 }}>/ 100</div>
      </div>
      <div
        style={{
          display: "inline-flex",
          marginTop: 10,
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
  } = useKobo();
  const [dashLayout, setDashLayout] = useState<Layout>("overview");
  const [refreshing, setRefreshing] = useState(false);

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
  const budgetsTop = budgetsView(budgets, transactions, categories).slice(0, 3);
  const accountCards = accounts.map((a) => ({
    ...a,
    code: accountCode(a),
    grad: accountGradient(a),
    pct: total > 0 ? Math.round((a.balance / total) * 100) + "%" : "0%",
  }));
  const cashflowData = monthlyCashflow(transactions);
  const hasCashflow = cashflowData.some((c) => c.cred > 0 || c.deb > 0);
  const cashflow = cashflowBars(cashflowData);
  const trend = trendBars(cashflowData);
  const recurring = subscriptionsView(subscriptions, categories);
  const recurTotal = monthlyRecurringTotal(subscriptions);

  const TREND_COLORS = ["#5B8DFF", "#7B6EF6", "#9F63E8", "#C459D6", "#E14FA8", "#FF8A65"];
  const trendTotalOut = cashflowData.reduce((a, c) => a + c.deb, 0);
  let trendAcc = 0;
  const trendSegs = cashflowData.map((c, i) => {
    const start = trendTotalOut > 0 ? (trendAcc / trendTotalOut) * 100 : 0;
    trendAcc += c.deb;
    const end = trendTotalOut > 0 ? (trendAcc / trendTotalOut) * 100 : 0;
    return `${TREND_COLORS[i % TREND_COLORS.length]} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
  });
  const trendDonut = trendTotalOut > 0 ? `conic-gradient(${trendSegs.join(",")})` : "#2A2960";
  const trendPeak = cashflowData.reduce((a, c) => (c.deb > a.deb ? c : a), cashflowData[0]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
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

      {dashLayout === "overview" && (
        <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              className="kb-herocard"
              style={{
                background: "linear-gradient(135deg,#14141E 0%,#1E1C3A 52%,#2E2768 100%)",
                borderRadius: 24,
                padding: 28,
                minHeight: 214,
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
                    <div style={{ fontSize: 13, color: "#B7B7D4", fontWeight: 600 }}>Total balance · {monthLabel(monthStart)}</div>
                    <div className="kb-hero" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.025em", marginTop: 7, lineHeight: 1 }}>
                      {naira(total)}
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
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 14 }}>
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

      {dashLayout === "cards" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18, marginBottom: 20 }}>
            {accountCards.map((a) => (
              <div
                key={a.id}
                onClick={() => router.push("/accounts")}
                style={{
                  borderRadius: 22,
                  padding: 22,
                  background: a.grad,
                  color: "#fff",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 170,
                  cursor: "pointer",
                  boxShadow: "0 12px 30px rgba(0,0,0,.14)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.14)",
                    filter: "blur(20px)",
                    top: -70,
                    right: -50,
                  }}
                />
                <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: "rgba(255,255,255,.22)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {a.code}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)" }}>{a.type}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.78)", fontWeight: 600 }}>{a.pct}</div>
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", letterSpacing: ".04em" }}>{a.masked_number}</div>
                    <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>{naira(a.balance)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
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
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 14 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 18 }}>This month</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: 1, background: "#F2FBF6", borderRadius: 15, padding: 15 }}>
                    <div style={{ fontSize: 12, color: "#0E9E6A", fontWeight: 700 }}>Money in</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 5, color: "#0E7A52" }}>{naira(monthIn)}</div>
                  </div>
                  <div style={{ flex: 1, background: "#FEF3F2", borderRadius: 15, padding: 15 }}>
                    <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>Money out</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 5, color: "#B42318" }}>{naira(monthOut)}</div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid #F0F0F3",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#6B6F7B" }}>Net cashflow</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#12B76A" }}>{netFmt}</div>
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 22, padding: 22 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 16 }}>Top categories</div>
                {topCats.length === 0 ? (
                  <EmptyState icon="grid" text="No spending yet this month" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {topCats.slice(0, 3).map((c) => (
                      <div key={c.id}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: c.color }}>
                              <Icon name={c.icon} size={18} />
                            </span>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{c.fmt}</div>
                        </div>
                        <div style={{ height: 8, borderRadius: 6, background: "#EFEFF3", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: c.barW, background: c.color, borderRadius: 6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {dashLayout === "analytics" && (
        <div className="kb-resp" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minHeight: 186 }}>
                {cashflow.map((c) => (
                  <div key={c.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 160 }}>
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
                background: "rgba(91,141,255,.3)",
                filter: "blur(45px)",
                bottom: -70,
                left: -30,
              }}
            />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 13, color: "#B7B7D4", fontWeight: 600 }}>Net this month</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", marginTop: 6 }}>{netFmt}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11.5, color: "#9EE7C0", fontWeight: 700 }}>In</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{naira(monthIn)}</div>
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11.5, color: "#FFA9B6", fontWeight: 700 }}>Out</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{naira(monthOut)}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.12)" }}>
                <div style={{ fontSize: 12, color: "#B7B7D4", fontWeight: 600, marginBottom: 14 }}>Spending trend</div>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ position: "relative", width: 108, height: 108, flexShrink: 0 }}>
                    <div style={{ width: 108, height: 108, borderRadius: "50%", background: trendDonut }} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 15,
                        background: "#1B1A3B",
                        borderRadius: "50%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ fontSize: 9.5, color: "#9A9AB0", fontWeight: 600 }}>{trendTotalOut > 0 ? "Peak" : ""}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{trendTotalOut > 0 ? trendPeak.m : "No spend"}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {trend.map((b, i) => (
                      <div key={b.m} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: TREND_COLORS[i % TREND_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 11.5, color: "#C7C7DE", flex: 1 }}>{b.m}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>{b.fmt}</span>
                      </div>
                    ))}
                  </div>
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
