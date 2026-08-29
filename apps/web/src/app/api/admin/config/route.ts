import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireAdmin";
import { logAdminAction } from "@/server/adminAudit";
import { supabase } from "@/server/supabase";
import { APP_CONFIG_KEYS, getAllConfig, type AppConfigKey } from "@/server/appConfig";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const config = await getAllConfig();
  return NextResponse.json({ config });
}

// Every change here is audit-logged with before/after value, per AR-07's
// explicit requirement ("since these values directly affect system
// behavior for all users") — no exception for config, same as every other
// state-changing admin action.
export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { key, value } = (await req.json()) as { key?: string; value?: unknown };
  if (!key || !APP_CONFIG_KEYS.includes(key as AppConfigKey) || value === undefined) {
    return NextResponse.json({ error: `key must be one of: ${APP_CONFIG_KEYS.join(", ")}` }, { status: 400 });
  }

  const { data: before } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();

  const { data, error } = await supabase
    .from("app_config")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update config" }, { status: 500 });

  await logAdminAction({
    actionType: "update",
    targetEntity: "config",
    targetId: key,
    beforeState: before?.value ?? null,
    afterState: value,
  });
  return NextResponse.json({ key, value: data.value });
}
