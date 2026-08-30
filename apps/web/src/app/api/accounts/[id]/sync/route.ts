import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { getMonoBalanceFinal, getMonoBalanceRealtime, getMonoJobStatus, MonoApiError } from "@/server/mono";
import { supabase } from "@/server/supabase";
import { recordSyncOutcome, syncTransactions } from "@/server/accountSync";

// See the matching comment in accounts/link/route.ts — a heavy account's
// sync can run long, and the default serverless timeout would kill it
// mid-upsert with no visible error.
export const maxDuration = 60;

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 5; // ~7.5s worst case — tune once real job timing is observed

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;
  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (!existing.mono_account_id) {
    return NextResponse.json({ error: "This account isn't linked to Mono" }, { status: 400 });
  }

  try {
    let balanceResult = await getMonoBalanceRealtime(existing.mono_account_id);

    if (balanceResult.jobStatus === "PROCESSING" && balanceResult.jobId) {
      let finished = false;
      for (let i = 0; i < MAX_POLL_ATTEMPTS && !finished; i++) {
        await delay(POLL_INTERVAL_MS);
        const status = await getMonoJobStatus(existing.mono_account_id, balanceResult.jobId);
        if (status === "FINISHED") finished = true;
        else if (status === "FAILED") break;
      }
      // If still not finished, fall through with whatever balanceResult
      // already has — the account_updated webhook will correct the row
      // asynchronously once the job actually completes.
      if (finished) balanceResult = await getMonoBalanceFinal(existing.mono_account_id);
    }

    let data = existing;
    if (balanceResult.balance != null) {
      const { data: updated, error } = await supabase
        .from("accounts")
        .update({ balance: balanceResult.balance / 100 })
        .eq("id", id)
        .select()
        .single();
      if (error || !updated) {
        return NextResponse.json({ error: error?.message ?? "Failed to update account balance" }, { status: 500 });
      }
      data = updated;
    }

    const result = await syncTransactions({
      userId,
      accountId: id,
      monoAccountId: existing.mono_account_id,
    });
    await recordSyncOutcome(id, result);

    return NextResponse.json({ account: data, transactionsImported: result.imported });
  } catch (err) {
    console.error(`[/api/accounts/${id}/sync] failed:`, err);
    if (err instanceof MonoApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error syncing account" }, { status: 500 });
  }
}
