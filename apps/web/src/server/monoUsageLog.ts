import { supabase } from "./supabase";

export type MonoEndpoint = "account_auth" | "account_details" | "account_transactions";

export async function logMonoCall(endpoint: MonoEndpoint, outcome: "success" | "failure", failureReason?: string): Promise<void> {
  const { error } = await supabase.from("mono_api_calls").insert({
    endpoint,
    outcome,
    failure_reason: failureReason ?? null,
  });
  // A logging failure shouldn't block or fail the underlying Mono call that
  // already succeeded or failed on its own — just note it and move on.
  if (error) console.error("[mono-usage] failed to log call:", error.message);
}

