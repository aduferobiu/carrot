import { supabase } from "../../lib/supabase";

export type Frequency = "weekly" | "monthly" | "yearly";

export const FREQUENCY_DAYS: Record<Frequency, number> = { weekly: 7, monthly: 30, yearly: 365 };

const DAY_MS = 1000 * 60 * 60 * 24;
// A cancelled-and-not-recharged subscription is left "active" for a while
// past this many days late before we flag it, since Nigerian merchant
// billing can slip a few days around weekends/holidays.
const STALE_TOLERANCE_DAYS = 3;
const ALERT_WINDOW_DAYS = 2;

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function frequencyFromIntervalDays(days: number): Frequency | null {
  if (days >= 5 && days <= 10) return "weekly";
  // Wider than a strict 30±5 days — real bill cycles (e.g. Discos) commonly
  // drift by a week or more between charges.
  if (days >= 25 && days <= 45) return "monthly";
  if (days >= 350 && days <= 380) return "yearly";
  return null;
}

type TxRow = {
  id: string;
  account_id: string;
  normalized_description: string | null;
  amount: number;
  occurred_at: string;
  category_id: string | null;
};

type Group = {
  accountId: string;
  merchantLabel: string;
  categoryId: string | null;
  occurrences: { date: Date; amount: number }[];
};

/** Groups the user's recent expense transactions by (account, normalized
 * description) — the same normalization already computed by the
 * categorization engine — and upserts anything that recurs on a
 * weekly/monthly/yearly cadence into `subscriptions`. Runs synchronously as
 * part of the account-sync flow (there's no cron/queue in this app), so it's
 * cheap: bounded to one user's last 6 months of transactions. */
export async function runDetection(userId: string): Promise<void> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, account_id, normalized_description, amount, occurred_at, category_id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("occurred_at", sixMonthsAgo.toISOString())
    .not("normalized_description", "is", null);
  if (error || !txs) return;

  const groups = new Map<string, Group>();
  for (const t of txs as TxRow[]) {
    const desc = (t.normalized_description ?? "").trim();
    if (!desc) continue;
    const key = `${t.account_id}::${desc}`;
    let g = groups.get(key);
    if (!g) {
      g = { accountId: t.account_id, merchantLabel: desc, categoryId: t.category_id, occurrences: [] };
      groups.set(key, g);
    }
    g.occurrences.push({ date: new Date(t.occurred_at), amount: t.amount });
  }

  const { data: existingSubs } = await supabase.from("subscriptions").select("*").eq("user_id", userId);
  const existingByKey = new Map((existingSubs ?? []).map((s) => [`${s.account_id}::${s.merchant_label}`, s]));
  const detectedKeys = new Set<string>();

  for (const [key, g] of groups) {
    if (g.occurrences.length < 3) continue;

    const sorted = [...g.occurrences].sort((a, b) => a.date.getTime() - b.date.getTime());
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / DAY_MS);
    }
    const frequency = frequencyFromIntervalDays(median(intervals));
    if (!frequency) continue;

    const existing = existingByKey.get(key);
    if (existing?.status === "dismissed") continue;
    detectedKeys.add(key);

    const lastSeen = sorted[sorted.length - 1].date;
    const firstSeen = sorted[0].date;
    const avgAmount = g.occurrences.reduce((a, o) => a + o.amount, 0) / g.occurrences.length;
    const predictedNext = new Date(lastSeen.getTime() + FREQUENCY_DAYS[frequency] * DAY_MS);
    const status = existing?.status === "manual" ? "manual" : "active";

    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        account_id: g.accountId,
        merchant_label: g.merchantLabel,
        category_id: g.categoryId,
        frequency,
        average_amount: Math.round(avgAmount * 100) / 100,
        last_amount: sorted[sorted.length - 1].amount,
        first_seen_at: firstSeen.toISOString().slice(0, 10),
        last_seen_at: lastSeen.toISOString().slice(0, 10),
        predicted_next_charge_at: predictedNext.toISOString().slice(0, 10),
        status,
      },
      { onConflict: "user_id,account_id,merchant_label" },
    );
  }

  // Staleness pass: an active subscription that wasn't refreshed by fresh
  // detection above and is well past its predicted date likely got
  // cancelled outside the app — flag it instead of silently staying "active".
  const today = new Date();
  for (const sub of existingSubs ?? []) {
    if (sub.status !== "active") continue;
    const key = `${sub.account_id}::${sub.merchant_label}`;
    if (detectedKeys.has(key)) continue;
    if (!sub.predicted_next_charge_at) continue;
    const daysPast = (today.getTime() - new Date(sub.predicted_next_charge_at).getTime()) / DAY_MS;
    if (daysPast > STALE_TOLERANCE_DAYS) {
      await supabase.from("subscriptions").update({ status: "needs_review" }).eq("id", sub.id);
    }
  }

  // Alert pass: notify once per predicted charge date for anything due soon.
  const { data: dueSoon } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .not("predicted_next_charge_at", "is", null);
  const todayStr = today.toISOString().slice(0, 10);
  const windowEnd = new Date(today.getTime() + ALERT_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);

  for (const sub of dueSoon ?? []) {
    if (!sub.predicted_next_charge_at) continue;
    if (sub.predicted_next_charge_at < todayStr || sub.predicted_next_charge_at > windowEnd) continue;
    if (sub.last_alerted_at === sub.predicted_next_charge_at) continue;
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "subscription_renewal",
      title: sub.merchant_label,
      message: `About ₦${Number(sub.average_amount).toLocaleString()} due on ${sub.predicted_next_charge_at}`,
      icon: "refresh",
      color: "#2C6BFF",
    });
    await supabase.from("subscriptions").update({ last_alerted_at: sub.predicted_next_charge_at }).eq("id", sub.id);
  }
}
