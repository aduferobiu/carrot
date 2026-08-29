import { NextResponse } from "next/server";
import { getConfig } from "@/server/appConfig";

// The only two app_config values the regular (non-admin) client needs, and
// the only reason this route exists at all — app_config itself stays fully
// admin-locked (RLS enabled, no policy) rather than opening any part of the
// table to the regular client. No auth required: maintenance status has to
// be checkable before a visitor is even signed in.
export async function GET() {
  const [budgetAlertThresholds, maintenanceMode] = await Promise.all([
    getConfig<{ warn: number; over: number }>("budget_alert_thresholds"),
    getConfig<{ enabled: boolean; message: string }>("maintenance_mode"),
  ]);
  return NextResponse.json({ budgetAlertThresholds, maintenanceMode });
}
