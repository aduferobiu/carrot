const PAGE_SIZE = 1000;

/** Supabase's REST API caps a single response at 1000 rows by default —
 * silently, with no error, just a truncated result. Any query that can
 * plausibly return more than that (a heavy account's transactions, in
 * particular) has to page through with `.range()` instead of trusting a
 * single `.select()` to return everything. `build` receives an inclusive
 * `[from, to]` row range and must apply the *same* deterministic order on
 * every call — ties on the primary sort column (e.g. many transactions
 * sharing one `occurred_at`) need a unique secondary column too, or rows can
 * be skipped or repeated across page boundaries. */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
