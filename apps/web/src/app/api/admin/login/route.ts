import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken, verifyPassword } from "@/server/adminAuth";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h, matches the token's own expiry

// A fixed delay on every failed attempt — not a real rate limiter, but it
// slows down naive credential-stuffing against a single hardcoded account.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    console.error("[admin/login] ADMIN_EMAIL or ADMIN_PASSWORD_HASH is not configured");
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
  }

  const emailMatches = email?.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  const passwordMatches = !!password && verifyPassword(password, adminPasswordHash);

  if (!emailMatches || !passwordMatches) {
    await delay(500);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
