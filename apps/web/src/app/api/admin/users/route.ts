import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";

// AR-02: paginated/searchable user list. Deliberately returns only email,
// timestamps, status, and an account count — never decrypted bank tokens,
// raw transactions, or amounts (that boundary is intentional, not an
// oversight, per the requirement doc).
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const perPage = 50;

  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let users = data.users;
  if (search) users = users.filter((u) => u.email?.toLowerCase().includes(search));

  const accountCounts = await Promise.all(
    users.map(async (u) => {
      const { count } = await supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", u.id);
      return [u.id, count ?? 0] as const;
    }),
  );
  const countByUserId = new Map(accountCounts);

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    status: u.banned_until && new Date(u.banned_until) > new Date() ? "suspended" : "active",
    account_count: countByUserId.get(u.id) ?? 0,
  }));

  return NextResponse.json({ users: rows, page, perPage, total: data.total });
}
