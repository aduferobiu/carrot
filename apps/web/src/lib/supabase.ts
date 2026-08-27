import { createClient } from "@supabase/supabase-js";

// Falls back to placeholder values so `createClient()` doesn't throw during
// `next build`'s static prerendering — every "use client" component (this
// one included, via the Kobo store) still gets server-rendered once during
// that pass, with no real request/browser involved. The real env vars are
// baked into the client bundle at build time via NEXT_PUBLIC_ prefixing, so
// as long as they're set when you actually run the build, the deployed app
// uses the real values — this fallback only avoids crashing the build
// itself if they're momentarily absent (e.g. a misconfigured preview env).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
