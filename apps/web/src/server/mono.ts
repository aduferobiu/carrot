import { logMonoCall } from "./monoUsageLog";

const MONO_BASE_URL = "https://api.withmono.com/v2";

function monoSecretKey(): string {
  const key = process.env.MONO_SECRET_KEY;
  if (!key) throw new Error("Missing MONO_SECRET_KEY env var");
  return key;
}

export class MonoApiError extends Error {}

export async function exchangeMonoCode(code: string): Promise<{ id: string }> {
  try {
    const res = await fetch(`${MONO_BASE_URL}/accounts/auth`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "mono-sec-key": monoSecretKey(),
      },
      body: JSON.stringify({ code }),
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new MonoApiError(`Mono code exchange failed (${res.status}): ${raw}`);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new MonoApiError(`Mono code exchange returned non-JSON response: ${raw}`);
    }
    // Mono has returned this either as a flat `{ id }` or wrapped in their
    // standard `{ status, message, data: { id } }` envelope — handle both.
    const id =
      (body as { id?: string })?.id ?? (body as { data?: { id?: string } })?.data?.id;
    if (!id) {
      throw new MonoApiError(`Mono code exchange response had no account id: ${raw}`);
    }
    await logMonoCall("account_auth", "success");
    return { id };
  } catch (err) {
    await logMonoCall("account_auth", "failure", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export type MonoAccountDetails = {
  data: {
    account: {
      id: string;
      name: string;
      currency: string;
      type: string;
      account_number: string;
      balance: number;
      institution: { name: string; bank_code: string; type: string };
    };
  };
};

export async function getMonoAccount(monoAccountId: string): Promise<MonoAccountDetails> {
  try {
    const res = await fetch(`${MONO_BASE_URL}/accounts/${monoAccountId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "mono-sec-key": monoSecretKey(),
      },
    });
    if (!res.ok) {
      throw new MonoApiError(`Mono account fetch failed (${res.status}): ${await res.text()}`);
    }
    const result = (await res.json()) as MonoAccountDetails;
    await logMonoCall("account_details", "success");
    return result;
  } catch (err) {
    await logMonoCall("account_details", "failure", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export type MonoJobStatus = "FINISHED" | "PROCESSING" | "FAILED";

export type MonoRealtimeBalance = {
  balance: number | null;
  currency: string | null;
  hasNewData: boolean;
  jobId: string | null;
  jobStatus: MonoJobStatus | null;
};

async function fetchMonoBalance(monoAccountId: string, realtime: boolean): Promise<MonoRealtimeBalance> {
  const res = await fetch(`${MONO_BASE_URL}/accounts/${monoAccountId}/balance`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "mono-sec-key": monoSecretKey(),
      "x-realtime": realtime ? "true" : "false",
    },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new MonoApiError(`Mono balance fetch failed (${res.status}): ${raw}`);
  }
  // A PROCESSING response can have a thin/empty body — data.balance is only
  // meaningful once the job has actually finished.
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    // tolerate a non-JSON body on a still-processing response
  }
  const data = (body as { data?: { balance?: unknown; currency?: unknown } })?.data;
  return {
    balance: typeof data?.balance === "number" ? data.balance : null,
    currency: typeof data?.currency === "string" ? data.currency : null,
    hasNewData: res.headers.get("x-has-new-data") === "true",
    jobId: res.headers.get("x-job-id"),
    jobStatus: (res.headers.get("x-job-status") as MonoJobStatus | null) ?? null,
  };
}

/** Triggers Mono's real-time data sync for this account's balance — unlike
 * `getMonoAccount`, which only returns Mono's last-cached snapshot, this
 * asks Mono to go fetch current data from the bank. May return the fresh
 * balance immediately, or a `jobStatus: "PROCESSING"` that the caller should
 * poll via `getMonoJobStatus` before re-reading with `getMonoBalanceFinal`. */
export async function getMonoBalanceRealtime(monoAccountId: string): Promise<MonoRealtimeBalance> {
  try {
    const result = await fetchMonoBalance(monoAccountId, true);
    await logMonoCall("account_details", "success");
    return result;
  } catch (err) {
    await logMonoCall("account_details", "failure", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/** Reads the balance without starting a new real-time session — call this
 * after a polled job reports FINISHED to get the settled value. */
export async function getMonoBalanceFinal(monoAccountId: string): Promise<MonoRealtimeBalance> {
  try {
    const result = await fetchMonoBalance(monoAccountId, false);
    await logMonoCall("account_details", "success");
    return result;
  } catch (err) {
    await logMonoCall("account_details", "failure", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/** Polls a real-time sync job's status. Not wrapped in logMonoCall — these
 * are lightweight status checks, not separately billed API usage worth
 * surfacing on the admin cost dashboard. */
export async function getMonoJobStatus(monoAccountId: string, jobId: string): Promise<MonoJobStatus | null> {
  const res = await fetch(`${MONO_BASE_URL}/accounts/${monoAccountId}/jobs/${jobId}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "mono-sec-key": monoSecretKey(),
    },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new MonoApiError(`Mono job status fetch failed (${res.status}): ${raw}`);
  }
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    // tolerate
  }
  const status = (body as { data?: { status?: unknown } })?.data?.status;
  return typeof status === "string" ? (status.toUpperCase() as MonoJobStatus) : null;
}

export type MonoTransaction = {
  id: string;
  narration: string;
  amount: number;
  type: string;
  date: string;
};

export async function getMonoTransactions(
  monoAccountId: string,
  range: { start: string; end: string },
): Promise<MonoTransaction[]> {
  try {
    const url = new URL(`${MONO_BASE_URL}/accounts/${monoAccountId}/transactions`);
    url.searchParams.set("start", range.start);
    url.searchParams.set("end", range.end);
    url.searchParams.set("paginate", "false");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "mono-sec-key": monoSecretKey(),
      },
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new MonoApiError(`Mono transactions fetch failed (${res.status}): ${raw}`);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new MonoApiError(`Mono transactions fetch returned non-JSON response: ${raw}`);
    }
    // Handle both a flat array and the `{ data: [...] }` envelope.
    const list = Array.isArray(body) ? body : (body as { data?: unknown[] })?.data;
    await logMonoCall("account_transactions", "success");
    return Array.isArray(list) ? (list as MonoTransaction[]) : [];
  } catch (err) {
    await logMonoCall("account_transactions", "failure", err instanceof Error ? err.message : String(err));
    throw err;
  }
}
