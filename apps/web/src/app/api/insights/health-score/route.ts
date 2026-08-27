import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { computeHealthScore } from "@/server/healthScore";

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  try {
    const result = await computeHealthScore(userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/insights/health-score] failed:", err);
    return NextResponse.json({ error: "Failed to compute health score" }, { status: 500 });
  }
}
