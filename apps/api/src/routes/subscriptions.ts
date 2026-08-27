import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { flagManualSubscription } from "../services/subscriptions";

export const subscriptionsRouter = Router();

subscriptionsRouter.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", req.userId)
    .order("predicted_next_charge_at", { ascending: true, nullsFirst: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ subscriptions: data ?? [] });
});

subscriptionsRouter.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: "dismissed" | "active" };
  if (status !== "dismissed" && status !== "active") {
    res.status(400).json({ error: "status must be 'dismissed' or 'active'" });
    return;
  }

  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  if (existing.user_id !== req.userId) {
    res.status(403).json({ error: "This subscription doesn't belong to you" });
    return;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Failed to update subscription" });
    return;
  }
  res.json({ subscription: data });
});

subscriptionsRouter.post("/manual", requireAuth, async (req, res) => {
  const { transactionId } = req.body as { transactionId?: string };
  if (!transactionId) {
    res.status(400).json({ error: "Missing transactionId" });
    return;
  }
  try {
    const result = await flagManualSubscription(req.userId!, transactionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to flag subscription" });
  }
});
