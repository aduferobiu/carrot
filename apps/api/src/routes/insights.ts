import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { computeHealthScore } from "../services/healthScore";

export const insightsRouter = Router();

insightsRouter.get("/health-score", requireAuth, async (req, res) => {
  try {
    const result = await computeHealthScore(req.userId!);
    res.json(result);
  } catch (err) {
    console.error("[/insights/health-score] failed:", err);
    res.status(500).json({ error: "Failed to compute health score" });
  }
});
