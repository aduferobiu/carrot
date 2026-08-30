import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { createManualSubscriptionFromSelection } from "@/server/subscriptions";

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  const { accountId, transactionIds } = (await req.json()) as { accountId?: string; transactionIds?: string[] };
  if (!accountId || !transactionIds?.length) {
    return NextResponse.json({ error: "Missing accountId or transactionIds" }, { status: 400 });
  }
  try {
    const result = await createManualSubscriptionFromSelection(userId, accountId, transactionIds);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create subscription" },
      { status: 400 },
    );
  }
}
