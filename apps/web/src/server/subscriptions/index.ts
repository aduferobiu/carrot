import { supabase } from "../supabase";
import { frequencyFromIntervalDays, median } from "./detect";

export { runDetection } from "./detect";

/** Replaces a manual subscription's stored transaction membership — the
 * source of truth for `status: 'manual'` subscriptions' "Transactions in
 * this group" list (auto-detected subscriptions keep deriving theirs live
 * by (account_id, normalized_description), unaffected by this table). */
async function relinkSubscriptionTransactions(userId: string, subscriptionId: string, transactionIds: string[]): Promise<void> {
  await supabase.from("subscription_transactions").delete().eq("subscription_id", subscriptionId);
  if (transactionIds.length === 0) return;
  await supabase.from("subscription_transactions").insert(
    transactionIds.map((transaction_id) => ({ user_id: userId, subscription_id: subscriptionId, transaction_id })),
  );
}

/** FR-09.7: lets a user flag a transaction as a subscription immediately,
 * without waiting for the 3-occurrence detection threshold. Groups it with
 * any other transactions sharing the same (account, normalized description)
 * so a second occurrence already on record gives a real predicted date. */
export async function flagManualSubscription(
  userId: string,
  transactionId: string,
): Promise<{ subscriptionId: string }> {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id, user_id, account_id, normalized_description, description, raw_description, amount, occurred_at, category_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !tx || tx.user_id !== userId) {
    throw new Error("Transaction not found");
  }

  const merchantLabel = (tx.normalized_description || tx.description || tx.raw_description || "").trim().toLowerCase();
  if (!merchantLabel) throw new Error("Transaction has no description to group by");

  const { data: sameGroup } = await supabase
    .from("transactions")
    .select("id, occurred_at, amount")
    .eq("user_id", userId)
    .eq("account_id", tx.account_id)
    .eq("normalized_description", merchantLabel)
    .order("occurred_at", { ascending: true });

  const occurrences = sameGroup && sameGroup.length > 0 ? sameGroup : [{ id: tx.id, occurred_at: tx.occurred_at, amount: tx.amount }];
  const amounts = occurrences.map((o) => o.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const firstSeen = occurrences[0].occurred_at.slice(0, 10);
  const lastOccurrence = occurrences[occurrences.length - 1];
  const lastSeen = lastOccurrence.occurred_at.slice(0, 10);

  let predictedNext: string | null = null;
  let frequency: "weekly" | "monthly" | "yearly" = "monthly";
  if (occurrences.length >= 2) {
    const last = new Date(lastOccurrence.occurred_at);
    const prev = new Date(occurrences[occurrences.length - 2].occurred_at);
    const intervalDays = (last.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    frequency = frequencyFromIntervalDays(intervalDays) ?? "monthly";
    predictedNext = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  const { data, error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        account_id: tx.account_id,
        merchant_label: merchantLabel,
        category_id: tx.category_id,
        frequency,
        average_amount: Math.round(avgAmount * 100) / 100,
        last_amount: lastOccurrence.amount,
        first_seen_at: firstSeen,
        last_seen_at: lastSeen,
        predicted_next_charge_at: predictedNext,
        status: "manual",
      },
      { onConflict: "user_id,account_id,merchant_label" },
    )
    .select()
    .single();
  if (upsertError || !data) throw new Error(upsertError?.message ?? "Failed to flag subscription");

  await relinkSubscriptionTransactions(userId, data.id, occurrences.map((o) => o.id));

  return { subscriptionId: data.id };
}

type SelectedTx = {
  id: string;
  occurred_at: string;
  amount: number;
  category_id: string | null;
  normalized_description: string | null;
  description: string | null;
  raw_description: string | null;
};

function labelFor(tx: SelectedTx): string {
  return (tx.normalized_description || tx.description || tx.raw_description || "").trim().toLowerCase();
}

/** Creates (or updates) a subscription from an explicit, user-picked set of
 * transactions — unlike `flagManualSubscription`, this never auto-expands
 * beyond what was selected. All selected transactions must belong to the
 * given account (a subscription is scoped to one account). */
export async function createManualSubscriptionFromSelection(
  userId: string,
  accountId: string,
  transactionIds: string[],
): Promise<{ subscriptionId: string }> {
  if (transactionIds.length === 0) throw new Error("Select at least one transaction");

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, occurred_at, amount, category_id, normalized_description, description, raw_description")
    .in("id", transactionIds)
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("type", "expense");
  if (error) throw new Error(error.message);
  if (!txs || txs.length !== transactionIds.length) {
    throw new Error("One or more selected transactions couldn't be included");
  }

  const sorted = [...(txs as SelectedTx[])].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  // merchant_label: the mode of the selection's label candidates, tie-broken
  // by the most recent transaction among the tied candidates.
  const counts = new Map<string, number>();
  for (const t of sorted) counts.set(labelFor(t), (counts.get(labelFor(t)) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const tiedLabels = new Set([...counts.entries()].filter(([, c]) => c === maxCount).map(([l]) => l));
  const winner = [...sorted].reverse().find((t) => tiedLabels.has(labelFor(t)))!;
  const merchantLabel = labelFor(winner);
  if (!merchantLabel) throw new Error("Selected transactions have no description to group by");

  const amounts = sorted.map((t) => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const firstSeen = sorted[0].occurred_at.slice(0, 10);
  const last = sorted[sorted.length - 1];
  const lastSeen = last.occurred_at.slice(0, 10);

  let predictedNext: string | null = null;
  let frequency: "weekly" | "monthly" | "yearly" = "monthly";
  if (sorted.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((new Date(sorted[i].occurred_at).getTime() - new Date(sorted[i - 1].occurred_at).getTime()) / (1000 * 60 * 60 * 24));
    }
    const medianInterval = median(intervals);
    frequency = frequencyFromIntervalDays(medianInterval, sorted.length) ?? "monthly";
    predictedNext = new Date(new Date(last.occurred_at).getTime() + medianInterval * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  const { data, error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        account_id: accountId,
        merchant_label: merchantLabel,
        category_id: winner.category_id,
        frequency,
        average_amount: Math.round(avgAmount * 100) / 100,
        last_amount: last.amount,
        first_seen_at: firstSeen,
        last_seen_at: lastSeen,
        predicted_next_charge_at: predictedNext,
        status: "manual",
      },
      { onConflict: "user_id,account_id,merchant_label" },
    )
    .select()
    .single();
  if (upsertError || !data) throw new Error(upsertError?.message ?? "Failed to create subscription");

  await relinkSubscriptionTransactions(userId, data.id, sorted.map((t) => t.id));

  return { subscriptionId: data.id };
}
