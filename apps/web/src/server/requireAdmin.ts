import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionToken } from "./adminAuth";

/** Validates the `admin_session` cookie against the hardcoded admin
 * credential's signed session — deliberately not `requireAuth`: admin
 * routes must reject a regular (even valid) user JWT, and reusing the
 * Supabase-Auth-based guard here would defeat that boundary (NFR-A2/AR-01).
 * Returns nothing on success, or a ready-to-return NextResponse on failure —
 * callers check `instanceof NextResponse` and return it directly. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.cookies.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  return null;
}
