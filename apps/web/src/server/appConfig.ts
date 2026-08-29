import { supabase } from "./supabase";

export type AppConfigKey =
  | "budget_alert_thresholds"
  | "suggestion_correction_threshold"
  | "suggestion_aggregation_mode"
  | "personal_rule_correction_threshold"
  | "sync_frequency_hours"
  | "mono_pricing"
  | "mono_alert_thresholds"
  | "maintenance_mode";

export const APP_CONFIG_KEYS: AppConfigKey[] = [
  "budget_alert_thresholds",
  "suggestion_correction_threshold",
  "suggestion_aggregation_mode",
  "personal_rule_correction_threshold",
  "sync_frequency_hours",
  "mono_pricing",
  "mono_alert_thresholds",
  "maintenance_mode",
];

// Mirrors the seed migration exactly — a fallback so a missing row (should
// one ever be deleted) degrades to today's previously-hardcoded behavior
// rather than throwing.
const DEFAULTS: Record<AppConfigKey, unknown> = {
  budget_alert_thresholds: { warn: 80, over: 100 },
  suggestion_correction_threshold: 3,
  suggestion_aggregation_mode: "cross_user",
  personal_rule_correction_threshold: 3,
  sync_frequency_hours: null,
  mono_pricing: { account_auth: 0, account_details: 0, account_transactions: 0 },
  mono_alert_thresholds: { failureRatePct: 20, dailySpendNgn: 0 },
  maintenance_mode: { enabled: false, message: "" },
};

export async function getConfig<T = unknown>(key: AppConfigKey): Promise<T> {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? DEFAULTS[key]) as T;
}

export async function getAllConfig(): Promise<Record<AppConfigKey, unknown>> {
  const { data } = await supabase.from("app_config").select("key, value");
  const map = { ...DEFAULTS };
  for (const row of data ?? []) {
    if (APP_CONFIG_KEYS.includes(row.key as AppConfigKey)) map[row.key as AppConfigKey] = row.value;
  }
  return map;
}
