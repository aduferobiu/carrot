import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { supabase } from "@/server/supabase";
import { recordCorrection } from "@/server/categorization";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;
  const { id } = await params;

  const { categoryId } = (await req.json()) as { categoryId?: string };
  if (!categoryId) {
    return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
  }

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("id, user_id, description, raw_description")
    .eq("id", id)
    .maybeSingle();
  if (txError || !tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (tx.user_id !== userId) {
    return NextResponse.json({ error: "This transaction doesn't belong to you" }, { status: 403 });
  }

  const { data: cat, error: catError } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (catError || !cat) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }
  if (!cat.parent_id) {
    return NextResponse.json({ error: "Choose a subcategory, not a top-level category" }, { status: 400 });
  }

  const { data: parent } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", cat.parent_id)
    .maybeSingle();

  const { ruleLearned } = await recordCorrection(userId, id, tx.description ?? tx.raw_description, categoryId);

  return NextResponse.json({
    transactionId: id,
    categoryId: cat.id,
    categoryName: cat.name,
    parentCategoryId: parent?.id ?? null,
    parentCategoryName: parent?.name ?? null,
    ruleLearned,
  });
}
