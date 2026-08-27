import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

/** Validates the `Authorization: Bearer <token>` header against Supabase Auth.
 * Returns the userId on success, or a ready-to-return NextResponse on
 * failure — callers should check `instanceof NextResponse` and return it
 * directly, mirroring the old Express `requireAuth` middleware's behavior
 * without needing a middleware chain. */
export async function requireAuth(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  return data.user.id;
}
