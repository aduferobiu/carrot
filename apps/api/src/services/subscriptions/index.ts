import { supabase } from "../../lib/supabase";
import { frequencyFromIntervalDays } from "./detect";

export { runDetection } from "./detect";

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
    .select("occurred_at, amount")
    .eq("user_id", userId)
    .eq("account_id", tx.account_id)
    .eq("normalized_description", merchantLabel)
    .order("occurred_at", { ascending: true });

  const occurrences = sameGroup && sameGroup.length > 0 ? sameGroup : [{ occurred_at: tx.occurred_at, amount: tx.amount }];
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

  return { subscriptionId: data.id };
}
