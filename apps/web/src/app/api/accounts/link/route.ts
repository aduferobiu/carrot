import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { exchangeMonoCode, getMonoAccount, MonoApiError } from "@/server/mono";
import { supabase } from "@/server/supabase";
import { syncTransactions } from "@/server/accountSync";

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  const { code } = (await req.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const { id: monoAccountId } = await exchangeMonoCode(code);
    const details = await getMonoAccount(monoAccountId);
    const account = details.data.account;
    const masked = account.account_number ? "****" + account.account_number.slice(-4) : null;

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
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
      return NextResponse.json({ error: error?.message ?? "Failed to save linked account" }, { status: 500 });
    }

    const transactionsImported = await syncTransactions({
      userId,
      accountId: data.id,
      monoAccountId,
    });

    return NextResponse.json({ account: data, transactionsImported });
  } catch (err) {
    console.error("[/api/accounts/link] failed:", err);
    if (err instanceof MonoApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error linking account" }, { status: 500 });
  }
}
