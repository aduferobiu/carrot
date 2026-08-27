import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { flagManualSubscription } from "@/server/subscriptions";

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  const { transactionId } = (await req.json()) as { transactionId?: string };
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
  }
  try {
    const result = await flagManualSubscription(userId, transactionId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to flag subscription" },
      { status: 400 },
    );
  }
}
