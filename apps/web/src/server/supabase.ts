import { createClient } from "@supabase/supabase-js";

// Falls back to placeholder values so `createClient()` doesn't throw during
// `next build`'s "collecting page data" step, which imports every route
// module (this one included, transitively) just to inspect it — no request
// is ever handled in that pass, so a missing env var there would otherwise
// fail the entire build. At actual runtime, Vercel has the real env vars
// loaded before any request reaches a route handler, so this only matters
// for genuinely-missing configuration, where requests will then fail with a
// Supabase auth/network error instead of this clearer message — an
// acceptable tradeoff for not breaking every build over one unused route.
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[server/supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — using placeholder values.");
}

// Service-role client — bypasses RLS. Server-only: never import this from a
// "use client" component or a route that isn't a Route Handler.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
