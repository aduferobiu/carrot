import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { supabase } from "@/server/supabase";

// ?userId=... filters to one user (this is also what AR-02's per-user
// profile page will call, scoped, once that phase exists). Personal rules
// are anything in categorization_rules with a non-null user_id, regardless
// of whether they were auto-learned (source='user_derived') or restricted
// here from a Tab 2 suggestion (source='restricted_suggestion') — AR-05
// wants both surfaced together with that origin visible per row.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const userId = req.nextUrl.searchParams.get("userId");
  let query = supabase.from("categorization_rules").select("*").not("user_id", "is", null).order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data: rules, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uniqueUserIds = [...new Set((rules ?? []).map((r) => r.user_id as string))];
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    uniqueUserIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user?.email) emailByUserId.set(id, data.user.email);
    }),
  );

  const withCounts = await Promise.all(
    (rules ?? []).map(async (r) => {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("matched_rule_id", r.id);
      return { ...r, match_count: count ?? 0, user_email: emailByUserId.get(r.user_id as string) ?? r.user_id };
    }),
  );

  return NextResponse.json({ rules: withCounts });
}
