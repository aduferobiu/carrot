const MONO_BASE_URL = "https://api.withmono.com/v2";

function monoSecretKey(): string {
  const key = process.env.MONO_SECRET_KEY;
  if (!key) throw new Error("Missing MONO_SECRET_KEY env var");
  return key;
}

export class MonoApiError extends Error {}

export async function exchangeMonoCode(code: string): Promise<{ id: string }> {
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
  return { id };
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
  return (await res.json()) as MonoAccountDetails;
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
  return Array.isArray(list) ? (list as MonoTransaction[]) : [];
}
