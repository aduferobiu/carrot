import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  exchangeMonoCode,
  getMonoAccount,
  getMonoTransactions,
  MonoApiError,
  MonoTransaction,
} from "../lib/mono";
import { supabase } from "../lib/supabase";
import { categorizeBatch } from "../services/categorization";
import { runDetection } from "../services/subscriptions";

export const accountsRouter = Router();

// Mono's transactions endpoint expects dd-mm-yyyy, not ISO.
function monoDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** Best-effort: fetches ~6 months of history and upserts it (deduped on
 * mono_transaction_id, so calling this again to "refresh" never duplicates
 * rows). A failure here shouldn't undo an otherwise-successful account link. */
async function syncTransactions(params: {
  userId: string;
  accountId: string;
  monoAccountId: string;
}): Promise<number> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);

  let monoTxs: MonoTransaction[];
  try {
    monoTxs = await getMonoTransactions(params.monoAccountId, {
      start: monoDate(start),
      end: monoDate(end),
    });
  } catch (err) {
    console.error("[accounts] transaction sync fetch failed:", err);
    return 0;
  }
  if (monoTxs.length === 0) return 0;

  // Ids are pre-generated (rather than left to Postgres' default) so we can
  // categorize before the insert and still know which row each result
  // belongs to.
  const withIds = monoTxs.map((t) => ({ ...t, _id: randomUUID() }));
  const catResults = await categorizeBatch(
    withIds.map((t) => ({ id: t._id, description: t.narration })),
    params.userId,
  );
  const catByTxId = new Map(catResults.map((r) => [r.transactionId, r]));

  const rows = withIds.map((t) => {
    const type = t.type?.toLowerCase() === "credit" ? "income" : "expense";
    const cat = catByTxId.get(t._id)!;
    return {
      id: t._id,
      user_id: params.userId,
      account_id: params.accountId,
      category_id: cat.categoryId,
      type,
      amount: Math.abs(t.amount) / 100,
      description: t.narration,
      raw_description: t.narration,
      normalized_description: cat.normalizedDescription,
      category_source: cat.categorySource,
      matched_rule_id: cat.matchedRuleId,
      occurred_at: new Date(t.date).toISOString(),
      mono_transaction_id: t.id,
    };
  });

  // With ignoreDuplicates, only genuinely-new rows come back from `.select()`
  // — rows skipped as duplicates (already synced in an earlier call) never
  // hit the DB under the id we generated for them here.
  const { data: inserted, error, count } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "mono_transaction_id", ignoreDuplicates: true, count: "exact" })
    .select("id, category_source, normalized_description");
  if (error) {
    console.error("[accounts] transaction sync upsert failed:", error.message);
    return 0;
  }

  const fallbackLogs = (inserted ?? [])
    .filter((r) => r.category_source === "fallback")
    .map((r) => ({ transaction_id: r.id, normalized_description: r.normalized_description }));
  if (fallbackLogs.length > 0) {
    await supabase.from("uncategorized_log").insert(fallbackLogs);
  }

  await runDetection(params.userId);

  return count ?? 0;
}

accountsRouter.post("/link", requireAuth, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  try {
    const { id: monoAccountId } = await exchangeMonoCode(code);
    const details = await getMonoAccount(monoAccountId);
    const account = details.data.account;
    const masked = account.account_number ? "****" + account.account_number.slice(-4) : null;

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: req.userId,
        name: account.name || account.institution.name,
        type: account.type,
        institution_name: account.institution.name,
        masked_number: masked,
        balance: account.balance / 100,
        currency: account.currency,
        mono_account_id: monoAccountId,
      })
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message ?? "Failed to save linked account" });
      return;
    }

    const transactionsImported = await syncTransactions({
      userId: req.userId!,
      accountId: data.id,
      monoAccountId,
    });

    res.json({ account: data, transactionsImported });
  } catch (err) {
    console.error("[/accounts/link] failed:", err);
    if (err instanceof MonoApiError) {
      res.status(502).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Unexpected error linking account" });
  }
});

accountsRouter.post("/:id/sync", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: fetchError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (fetchError || !existing) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  if (!existing.mono_account_id) {
    res.status(400).json({ error: "This account isn't linked to Mono" });
    return;
  }

  try {
    const details = await getMonoAccount(existing.mono_account_id);
    const account = details.data.account;

    const { data, error } = await supabase
      .from("accounts")
      .update({ balance: account.balance / 100 })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message ?? "Failed to update account balance" });
      return;
    }

    const transactionsImported = await syncTransactions({
      userId: req.userId!,
      accountId: id,
      monoAccountId: existing.mono_account_id,
    });

    res.json({ account: data, transactionsImported });
  } catch (err) {
    console.error(`[/accounts/${id}/sync] failed:`, err);
    if (err instanceof MonoApiError) {
      res.status(502).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Unexpected error syncing account" });
  }
});
