"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type Config = {
  budget_alert_thresholds: { warn: number; over: number };
  suggestion_correction_threshold: number;
  suggestion_aggregation_mode: "cross_user" | "per_user";
  personal_rule_correction_threshold: number;
  sync_frequency_hours: number | null;
  mono_pricing: { account_auth: number; account_details: number; account_transactions: number };
  mono_alert_thresholds: { failureRatePct: number; dailySpendNgn: number };
  maintenance_mode: { enabled: boolean; message: string };
};

function Section({ title, sub, children, onSave, saving }: { title: string; sub: string; children: React.ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>{title}</div>
      <div style={s.sectionSub}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <button style={{ ...s.btnPrimary, marginTop: 16 }} disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export function AdminSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch<{ config: Config }>("/api/admin/config");
      setConfig(res.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: keyof Config, value: unknown) {
    setSavingKey(key);
    setSavedKey(null);
    setError("");
    try {
      await adminFetch("/api/admin/config", { method: "PATCH", body: JSON.stringify({ key, value }) });
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading || !config) {
    return (
      <AdminLayout title="Settings" subtitle="System configuration — every change here is audit-logged">
        <div style={s.card}>Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" subtitle="System configuration — every change here is audit-logged with the previous and new value">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && <div style={{ ...s.card, borderColor: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

        <Section
          title="Maintenance mode"
          sub="Shows every user an informational message in place of normal functionality. Never affects the admin panel itself."
          saving={savingKey === "maintenance_mode"}
          onSave={() => save("maintenance_mode", config.maintenance_mode)}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.maintenance_mode.enabled}
              onChange={(e) => setConfig({ ...config, maintenance_mode: { ...config.maintenance_mode, enabled: e.target.checked } })}
            />
            Maintenance mode enabled
          </label>
          <Field label="Message shown to users">
            <textarea
              style={{ ...s.input, width: "100%", height: 70, resize: "vertical", paddingTop: 8 }}
              value={config.maintenance_mode.message}
              onChange={(e) => setConfig({ ...config, maintenance_mode: { ...config.maintenance_mode, message: e.target.value } })}
              placeholder="We're making some improvements. Please check back shortly."
            />
          </Field>
          {savedKey === "maintenance_mode" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>

        <Section
          title="Budget alerts"
          sub="Percent-of-budget thresholds that flip a budget's status to warn / over on the user-facing Budgets page."
          saving={savingKey === "budget_alert_thresholds"}
          onSave={() => save("budget_alert_thresholds", config.budget_alert_thresholds)}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Warn at (%)">
              <input
                style={s.input}
                type="number"
                value={config.budget_alert_thresholds.warn}
                onChange={(e) => setConfig({ ...config, budget_alert_thresholds: { ...config.budget_alert_thresholds, warn: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Over at (%)">
              <input
                style={s.input}
                type="number"
                value={config.budget_alert_thresholds.over}
                onChange={(e) => setConfig({ ...config, budget_alert_thresholds: { ...config.budget_alert_thresholds, over: Number(e.target.value) } })}
              />
            </Field>
          </div>
          {savedKey === "budget_alert_thresholds" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>

        <Section
          title="Categorization suggestion threshold (Tab 2)"
          sub="How many corrections to the same (description, category) pair trigger a global suggestion, and whether that count is aggregated across all users or must come from one user alone."
          saving={savingKey === "suggestion_correction_threshold" || savingKey === "suggestion_aggregation_mode"}
          onSave={() => {
            save("suggestion_correction_threshold", config.suggestion_correction_threshold);
            save("suggestion_aggregation_mode", config.suggestion_aggregation_mode);
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Correction threshold">
              <input
                style={s.input}
                type="number"
                min={1}
                value={config.suggestion_correction_threshold}
                onChange={(e) => setConfig({ ...config, suggestion_correction_threshold: Number(e.target.value) })}
              />
            </Field>
            <Field label="Aggregation mode">
              <select
                style={s.select}
                value={config.suggestion_aggregation_mode}
                onChange={(e) => setConfig({ ...config, suggestion_aggregation_mode: e.target.value as "cross_user" | "per_user" })}
              >
                <option value="cross_user">Cross-user (total across everyone)</option>
                <option value="per_user">Per-user (one user's own repeats)</option>
              </select>
            </Field>
          </div>
          {(savedKey === "suggestion_correction_threshold" || savedKey === "suggestion_aggregation_mode") && (
            <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>
          )}
        </Section>

        <Section
          title="Personal rule threshold (Tab 3)"
          sub="How many of one user's own corrections to the same pattern auto-activate a personal rule for them."
          saving={savingKey === "personal_rule_correction_threshold"}
          onSave={() => save("personal_rule_correction_threshold", config.personal_rule_correction_threshold)}
        >
          <Field label="Correction threshold">
            <input
              style={s.input}
              type="number"
              min={1}
              value={config.personal_rule_correction_threshold}
              onChange={(e) => setConfig({ ...config, personal_rule_correction_threshold: Number(e.target.value) })}
            />
          </Field>
          {savedKey === "personal_rule_correction_threshold" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>

        <Section
          title="Scheduled balance-sync frequency"
          sub="Note: this app has no background scheduler today — accounts sync only when a user links or manually refreshes one. This value is stored for when a scheduler exists, but nothing currently reads it to trigger a sync."
          saving={savingKey === "sync_frequency_hours"}
          onSave={() => save("sync_frequency_hours", config.sync_frequency_hours)}
        >
          <Field label="Hours between syncs (blank = not scheduled)">
            <input
              style={s.input}
              type="number"
              min={1}
              value={config.sync_frequency_hours ?? ""}
              onChange={(e) => setConfig({ ...config, sync_frequency_hours: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
          {savedKey === "sync_frequency_hours" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>

        <Section
          title="Mono pricing (per request, in naira)"
          sub="Feeds the estimated cost figures on the Aggregator Usage screen. Defaults to 0 (unconfigured) rather than a guess."
          saving={savingKey === "mono_pricing"}
          onSave={() => save("mono_pricing", config.mono_pricing)}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Account linking">
              <input
                style={s.input}
                type="number"
                step="0.01"
                value={config.mono_pricing.account_auth}
                onChange={(e) => setConfig({ ...config, mono_pricing: { ...config.mono_pricing, account_auth: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Balance retrieval">
              <input
                style={s.input}
                type="number"
                step="0.01"
                value={config.mono_pricing.account_details}
                onChange={(e) => setConfig({ ...config, mono_pricing: { ...config.mono_pricing, account_details: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Transaction retrieval">
              <input
                style={s.input}
                type="number"
                step="0.01"
                value={config.mono_pricing.account_transactions}
                onChange={(e) => setConfig({ ...config, mono_pricing: { ...config.mono_pricing, account_transactions: Number(e.target.value) } })}
              />
            </Field>
          </div>
          {savedKey === "mono_pricing" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>

        <Section
          title="Aggregator alert thresholds"
          sub="When either is crossed, the Aggregator Usage screen shows a prominent alert banner."
          saving={savingKey === "mono_alert_thresholds"}
          onSave={() => save("mono_alert_thresholds", config.mono_alert_thresholds)}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Failure rate alert (%)">
              <input
                style={s.input}
                type="number"
                value={config.mono_alert_thresholds.failureRatePct}
                onChange={(e) => setConfig({ ...config, mono_alert_thresholds: { ...config.mono_alert_thresholds, failureRatePct: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Daily spend alert (₦, 0 = off)">
              <input
                style={s.input}
                type="number"
                value={config.mono_alert_thresholds.dailySpendNgn}
                onChange={(e) => setConfig({ ...config, mono_alert_thresholds: { ...config.mono_alert_thresholds, dailySpendNgn: Number(e.target.value) } })}
              />
            </Field>
          </div>
          {savedKey === "mono_alert_thresholds" && <div style={{ fontSize: 12, color: "#15803D" }}>Saved.</div>}
        </Section>
      </div>
    </AdminLayout>
  );
}
