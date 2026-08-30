import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/server/supabase";
import { recordSyncOutcome } from "@/server/accountSync";

type MonoWebhookPayload = {
  event: string;
  event_id?: string;
  data: {
    account?: { _id: string; balance?: number; [k: string]: unknown };
    meta?: {
      data_status?: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
      sync_status?: "SUCCESSFUL" | "FAILED" | "REAUTHORISATION_REQUIRED";
      [k: string]: unknown;
    };
  };
};

// Mirrors adminAuth.ts's verifyAdminSessionToken guard: constant-time
// comparison against a secret Mono generates when the webhook URL is
// registered in their dashboard (plain string match, not HMAC).
function webhookSecretMatches(candidate: string | null): boolean {
  const expected = process.env.MONO_WEBHOOK_SECRET;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handleAccountUpdated(payload: MonoWebhookPayload): Promise<void> {
  const account = payload.data?.account;
  if (!account?._id) return;

  const { data: existing, error: lookupError } = await supabase
    .from("accounts")
    .select("id")
    .eq("mono_account_id", account._id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) return; // not (or no longer) one of ours

  if (typeof account.balance === "number") {
    const { error } = await supabase.from("accounts").update({ balance: account.balance / 100 }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  }

  const syncStatus = payload.data?.meta?.sync_status;
  if (syncStatus === "SUCCESSFUL") {
    await recordSyncOutcome(existing.id, { imported: 0, error: null });
  } else if (syncStatus === "FAILED") {
    await recordSyncOutcome(existing.id, { imported: 0, error: "Mono real-time sync failed" });
  } else if (syncStatus === "REAUTHORISATION_REQUIRED") {
    await recordSyncOutcome(existing.id, { imported: 0, error: "Bank requires re-authentication to keep syncing" });
  }
}

export async function POST(req: NextRequest) {
  if (!webhookSecretMatches(req.headers.get("mono-webhook-secret"))) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let payload: MonoWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  try {
    if (payload.event === "mono.events.account_updated") {
      await handleAccountUpdated(payload);
    }
    // Other event types (e.g. mono.accounts.jobs.update): ack only, no action needed.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks/mono] failed to process event:", payload.event, err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
