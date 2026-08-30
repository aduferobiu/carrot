import { Account, Budget, Category, Subscription, Transaction } from "./data";
import { addMonths, dateLabel, naira, rgba, timeLabel } from "./format";

const FALLBACK_CATEGORY: Category = {
  id: "",
  user_id: null,
  name: "Others",
  kind: "expense",
  icon: "grid",
  color: "#6B7280",
  is_default: true,
  parent_id: null,
  is_active: true,
};

export function catById(categories: Category[], id: string | null): Category {
  if (!id) return FALLBACK_CATEGORY;
  return categories.find((c) => c.id === id) ?? FALLBACK_CATEGORY;
}

export function accById(accounts: Account[], id: string): Account {
  return (
    accounts.find((a) => a.id === id) ?? {
      id,
      user_id: "",
      name: "",
      type: "",
      institution_name: null,
      masked_number: null,
      balance: 0,
      currency: "NGN",
      mono_account_id: null,
      created_at: "",
    }
  );
}

export function sortedTx(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

export function filteredTx(
  transactions: Transaction[],
  filters: { accs: string[]; cats: string[]; search: string },
): Transaction[] {
  let arr = sortedTx(transactions);
  if (filters.accs.length > 0) arr = arr.filter((t) => filters.accs.includes(t.account_id));
  if (filters.cats.length > 0) arr = arr.filter((t) => !!t.category_id && filters.cats.includes(t.category_id));
  const q = filters.search.trim().toLowerCase();
  if (q) {
    arr = arr.filter((t) =>
      ((t.description ?? "") + " " + (t.raw_description ?? "")).toLowerCase().includes(q),
    );
  }
  return arr;
}

const SPEND_EXCLUDED_NAMES = new Set(["Transfers", "Savings"]);

export function spendByCat(transactions: Transaction[], categories: Category[]): Record<string, number> {
  const m: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.type !== "expense" || !t.category_id) return;
    const cat = catById(categories, t.category_id);
    if (SPEND_EXCLUDED_NAMES.has(cat.name)) return;
    m[t.category_id] = (m[t.category_id] || 0) + t.amount;
  });
  return m;
}

export type TopCat = {
  id: string;
  name: string;
  color: string;
  icon: string;
  fmt: string;
  pct: number;
  barW: string;
};

export function topCategories(spend: Record<string, number>, categories: Category[]): TopCat[] {
  const entries = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  return entries.map(([id, amt]) => {
    const c = catById(categories, id);
    const pct = Math.round((amt / total) * 100);
    return { id, name: c.name, color: c.color, icon: c.icon, fmt: naira(amt), pct, barW: pct + "%" };
  });
}

export function donutGradient(spend: Record<string, number>, categories: Category[]): string {
  const entries = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  let acc = 0;
  const segs = entries.map(([id, amt]) => {
    const c = catById(categories, id);
    const start = (acc / total) * 100;
    acc += amt;
    const end = (acc / total) * 100;
    return `${c.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
  });
  if (!segs.length) return "#EFEFF3";
  return `conic-gradient(${segs.join(",")})`;
}

export type BudgetView = {
  id: string;
  cat: string;
  catName: string;
  catColor: string;
  icon: string;
  iconBg: string;
  amount: number;
  spent: number;
  spentFmt: string;
  amtFmt: string;
  leftFmt: string;
  overFmt: string;
  pct: number;
  barW: string;
  status: "over" | "warn" | "ok";
  barColor: string;
  statusLabel: string;
};

/** `spent` is computed here from transactions within the budget's month, not
 * stored. `thresholds` defaults to the app's original hardcoded 80%/100% —
 * pass the live values from useKobo() (sourced from app_config, AR-07) to
 * respect whatever an admin has actually configured. */
export function budgetsView(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  thresholds: { warn: number; over: number } = { warn: 80, over: 100 },
): BudgetView[] {
  return budgets.map((b) => {
    const c = catById(categories, b.category_id);
    const periodEnd = addMonths(b.period_start, 1);
    const spent = transactions
      .filter(
        (t) =>
          t.category_id === b.category_id &&
          t.type === "expense" &&
          t.occurred_at >= b.period_start &&
          t.occurred_at < periodEnd,
      )
      .reduce((a, t) => a + t.amount, 0);
    const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    const status = pct >= thresholds.over ? "over" : pct >= thresholds.warn ? "warn" : "ok";
    const barColor = status === "over" ? "#EF4444" : status === "warn" ? "#F59E0B" : c.color;
    return {
      id: b.id,
      cat: b.category_id,
      catName: c.name,
      catColor: c.color,
      icon: c.icon,
      iconBg: rgba(c.color, 0.12),
      amount: b.amount,
      spent,
      spentFmt: naira(spent),
      amtFmt: naira(b.amount),
      leftFmt: naira(Math.max(0, b.amount - spent)),
      overFmt: naira(Math.max(0, spent - b.amount)),
      pct,
      barW: Math.min(100, pct) + "%",
      status,
      barColor,
      statusLabel:
        status === "over"
          ? "Over by " + naira(spent - b.amount)
          : status === "warn"
            ? "Almost there"
            : naira(b.amount - spent) + " left",
    };
  });
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Real credit/debit totals for the last 6 calendar months (oldest first),
 * computed from actual transactions — replaces what used to be a hardcoded
 * mock array feeding both the Cashflow chart and the Spending trend donut. */
export function monthlyCashflow(transactions: Transaction[]): { m: string; cred: number; deb: number }[] {
  const now = new Date();
  const months: { key: string; m: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, m: MONTH_ABBR[d.getMonth()] });
  }
  const totals = new Map(months.map((mo) => [mo.key, { cred: 0, deb: 0 }]));
  for (const t of transactions) {
    const d = new Date(t.occurred_at);
    const bucket = totals.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!bucket) continue;
    if (t.type === "income") bucket.cred += t.amount;
    else if (t.type === "expense") bucket.deb += t.amount;
  }
  return months.map((mo) => ({ m: mo.m, ...totals.get(mo.key)! }));
}

// `maxPx` is the actual measured pixel height available for bars (see
// useElementHeight) rather than a guessed constant, so bars fill however
// tall their container really ends up — including when a card is stretched
// to match a taller neighbor via CSS Grid.
export function cashflowBars(data: { m: string; cred: number; deb: number }[], maxPx: number) {
  const max = Math.max(...data.map((c) => Math.max(c.cred, c.deb))) || 1;
  return data.map((c) => ({
    m: c.m,
    credH: Math.round((c.cred / max) * maxPx) + "px",
    debH: Math.round((c.deb / max) * maxPx) + "px",
    credFmt: naira(c.cred),
    debFmt: naira(c.deb),
  }));
}


const FREQUENCY_LABEL: Record<Subscription["frequency"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// A yearly subscription contributes 1/12 of its amount per month, a weekly
// one contributes amount×4.33 (average weeks per month).
const FREQUENCY_MONTHLY_MULTIPLIER: Record<Subscription["frequency"], number> = {
  weekly: 4.33,
  monthly: 1,
  yearly: 1 / 12,
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function nextChargeLabel(dateStr: string | null): string {
  if (!dateStr) return "Not enough history yet";
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 6) return `In ${days} days`;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${target.getDate()} ${MONTHS[target.getMonth()]}`;
}

export type SubscriptionView = {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  amtFmt: string;
  freq: string;
  nextLabel: string;
  status: Subscription["status"];
};

export function subscriptionRowView(s: Subscription, categories: Category[]): SubscriptionView {
  const c = catById(categories, s.category_id);
  return {
    id: s.id,
    name: s.display_name || titleCase(s.merchant_label),
    icon: c.icon,
    iconBg: rgba(c.color, 0.12),
    iconColor: c.color,
    amtFmt: naira(s.average_amount),
    freq: FREQUENCY_LABEL[s.frequency],
    nextLabel: nextChargeLabel(s.predicted_next_charge_at),
    status: s.status,
  };
}

/** Excludes `dismissed` subscriptions (FR-09.6 — opted out, shouldn't
 * reappear in any list or total) but keeps `needs_review` visible so a
 * likely-cancelled subscription doesn't just silently vanish. */
export function subscriptionsView(subscriptions: Subscription[], categories: Category[]): SubscriptionView[] {
  return subscriptions.filter((s) => s.status !== "dismissed").map((s) => subscriptionRowView(s, categories));
}

export function monthlyRecurringTotal(subscriptions: Subscription[]): string {
  const total = subscriptions
    .filter((s) => s.status !== "dismissed")
    .reduce((a, s) => a + s.average_amount * FREQUENCY_MONTHLY_MULTIPLIER[s.frequency], 0);
  return naira(total);
}

export type TxViewRow = {
  id: string;
  title: string;
  raw: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  sub: string;
  catName: string;
  catColor: string;
  accName: string;
  amountFmt: string;
  amountColor: string;
  type: Transaction["type"];
};

export type Counterparty = { name: string; bank: string | null };

// Mono gives us only a free-text narration, never structured sender/receiver
// fields, so this is a best-effort parse of the handful of narration shapes
// Nigerian banks actually use for a person-to-person transfer. Many
// narrations glue a reference code directly onto the end of a name with no
// separator (e.g. "...ADEPOJU ADUFEAT126TRF2MPTL02U...") which can't be
// split from the name by any general pattern — those are deliberately left
// unmatched (returning null) rather than guessed at, since a wrong-looking
// name is worse than no name.
const COUNTERPARTY_PATTERNS: { re: RegExp; bank: number | null; name: number }[] = [
  { re: /OUTWARD TRANSFER TO\s+([A-Za-z][A-Za-z .]*?)\s*-\s*(.+)$/i, bank: 1, name: 2 },
  { re: /INWARD TRANSFER FROM\s+([A-Za-z][A-Za-z .]*?)\s*-\s*(.+)$/i, bank: 1, name: 2 },
  { re: /^Received from\s+(.+)$/i, bank: null, name: 1 },
];

export function parseCounterparty(rawDescription: string | null | undefined): Counterparty | null {
  if (!rawDescription) return null;
  for (const { re, bank, name } of COUNTERPARTY_PATTERNS) {
    const m = rawDescription.match(re);
    if (!m) continue;
    const nameVal = m[name]?.trim();
    if (!nameVal) continue;
    return { name: nameVal, bank: bank !== null ? (m[bank]?.trim() ?? null) : null };
  }
  return null;
}

export function txView(t: Transaction, accounts: Account[], categories: Category[]): TxViewRow {
  const c = catById(categories, t.category_id);
  const a = accById(accounts, t.account_id);
  return {
    id: t.id,
    title: t.description || t.raw_description || "Transaction",
    raw: t.raw_description ?? "",
    icon: c.icon,
    iconBg: rgba(c.color, 0.12),
    iconColor: c.color,
    sub: timeLabel(t.occurred_at) + " · " + a.name,
    catName: c.name,
    catColor: c.color,
    accName: a.name,
    amountFmt: (t.type === "income" ? "+ " : "– ") + naira(t.amount),
    amountColor: t.type === "income" ? "#12B76A" : "#15171C",
    type: t.type,
  };
}

export function groupByDate(transactions: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];
  let cur: { label: string; items: Transaction[] } | null = null;
  transactions.forEach((t) => {
    const lbl = dateLabel(t.occurred_at);
    if (!cur || cur.label !== lbl) {
      cur = { label: lbl, items: [] };
      groups.push(cur);
    }
    cur.items.push(t);
  });
  return groups;
}

export function monthTotals(transactions: Transaction[], monthStart: string) {
  const monthIn = transactions
    .filter((t) => t.occurred_at >= monthStart && t.type === "income")
    .reduce((a, b) => a + b.amount, 0);
  const monthOut = transactions
    .filter((t) => t.occurred_at >= monthStart && t.type === "expense")
    .reduce((a, b) => a + b.amount, 0);
  return { monthIn, monthOut, net: monthIn - monthOut };
}
