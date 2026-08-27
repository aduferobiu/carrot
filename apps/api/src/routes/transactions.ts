import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { recordCorrection } from "../services/categorization";

export const transactionsRouter = Router();

transactionsRouter.patch("/:id/category", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body as { categoryId?: string };
  if (!categoryId) {
    res.status(400).json({ error: "Missing categoryId" });
    return;
  }

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("id, user_id, description, raw_description")
    .eq("id", id)
    .maybeSingle();
  if (txError || !tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  if (tx.user_id !== req.userId) {
    res.status(403).json({ error: "This transaction doesn't belong to you" });
    return;
  }

  const { data: cat, error: catError } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (catError || !cat) {
    res.status(400).json({ error: "Category not found" });
    return;
  }
  if (!cat.parent_id) {
    res.status(400).json({ error: "Choose a subcategory, not a top-level category" });
    return;
  }

  const { data: parent } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", cat.parent_id)
    .maybeSingle();

  const { ruleLearned } = await recordCorrection(
    req.userId!,
    id,
    tx.description ?? tx.raw_description,
    categoryId,
  );

  res.json({
    transactionId: id,
    categoryId: cat.id,
    categoryName: cat.name,
    parentCategoryId: parent?.id ?? null,
    parentCategoryName: parent?.name ?? null,
    ruleLearned,
  });
});
