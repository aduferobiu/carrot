import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { getMonoAccount, MonoApiError } from "@/server/mono";
import { supabase } from "@/server/supabase";
import { syncTransactions } from "@/server/accountSync";

// See the matching comment in accounts/link/route.ts — a heavy account's
// sync can run long, and the default serverless timeout would kill it
// mid-upsert with no visible error.
export const maxDuration = 60;

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
    const details = await getMonoAccount(existing.mono_account_id);
    const account = details.data.account;

    const { data, error } = await supabase
      .from("accounts")
      .update({ balance: account.balance / 100 })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to update account balance" }, { status: 500 });
    }

    const transactionsImported = await syncTransactions({
      userId,
      accountId: id,
      monoAccountId: existing.mono_account_id,
    });

    return NextResponse.json({ account: data, transactionsImported });
  } catch (err) {
    console.error(`[/api/accounts/${id}/sync] failed:`, err);
    if (err instanceof MonoApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error syncing account" }, { status: 500 });
  }
}
