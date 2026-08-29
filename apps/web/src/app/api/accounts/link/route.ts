import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { exchangeMonoCode, getMonoAccount, MonoApiError } from "@/server/mono";
import { supabase } from "@/server/supabase";
import { syncTransactions } from "@/server/accountSync";

// A heavy account's initial 6-month sync (categorizing + upserting well over
// 1000 rows) can run past Next.js's default serverless timeout on plans that
// allow a longer one; the account row itself is already committed by then,
// so a killed request just leaves it stuck with zero transactions.
export const maxDuration = 60;

function nameTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Every word in the Carrot profile name must appear somewhere in the bank
 * account's name — order-independent (banks format names in different
 * orders, e.g. "SURNAME FIRST MIDDLE" vs "FIRST MIDDLE SURNAME"), but not
 * substring-fuzzy, so it still blocks linking someone else's account. */
function ownerNameMatches(carrotName: string, bankName: string): boolean {
  const carrotTokens = nameTokens(carrotName);
  if (carrotTokens.length === 0) return false;
  const bankTokens = new Set(nameTokens(bankName));
  return carrotTokens.every((t) => bankTokens.has(t));
}

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

    if (account.name) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const carrotName = profile?.full_name ?? "";
      if (carrotName && !ownerNameMatches(carrotName, account.name)) {
        return NextResponse.json(
          {
            error: `This account is registered to "${account.name}", which doesn't match your Carrot profile name. You can only link accounts held in your own name.`,
          },
          { status: 400 },
        );
      }
    }

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
