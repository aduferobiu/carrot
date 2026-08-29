"use client";

import { useState } from "react";
import { adminFetch } from "./adminFetch";
import * as s from "./adminStyles";

type TestResult = {
  rawTextTested: string;
  normalizedDescription: string;
  matched: boolean;
  category: string | null;
  categorySource: string;
  rule: { keyword: string; priority: number; source: string; scope: string } | null;
};

/** AR-08: usable standalone (the /admin/test-categorization page) and
 * embedded as a pre-check before committing a change elsewhere (Tab 1 rule
 * edits, Tab 2 suggestion approval) — `initialDescription` lets a caller
 * pre-fill it from context (e.g. a suggestion's sample narration). */
export function TestCategorizationWidget({ initialDescription = "", initialUserId = "" }: { initialDescription?: string; initialUserId?: string }) {
  const [description, setDescription] = useState(initialDescription);
  const [beneficiary, setBeneficiary] = useState("");
  const [userId, setUserId] = useState(initialUserId);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!description.trim()) {
      setError("Enter a description to test");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<TestResult>("/api/admin/test-categorization", {
        method: "POST",
        body: JSON.stringify({ description, beneficiaryIdentifier: beneficiary || undefined, userId: userId || undefined }),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Transaction description</div>
          <input style={{ ...s.input, width: "100%" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. VAT CHARGES" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Beneficiary identifier (optional)</div>
            <input style={{ ...s.input, width: "100%" }} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="e.g. KELECHI JECINTA ND IBUEZE" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>User ID (optional — tests their personal rules too)</div>
            <input style={{ ...s.input, width: "100%" }} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
          </div>
        </div>
        <button style={{ ...s.btnPrimary, alignSelf: "flex-start" }} disabled={busy} onClick={run}>
          {busy ? "Testing…" : "Test"}
        </button>
      </div>

      {error && <div style={{ color: "#B91C1C", fontSize: 13, marginTop: 12 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: "#FAFAFC", border: "1px solid #F0F0F3", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>NORMALIZED TO</div>
          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, marginBottom: 12 }}>{result.normalizedDescription || "(empty)"}</div>

          {result.matched && result.rule ? (
            <>
              <div style={s.badge("#DCFCE7", "#15803D")}>Matched a rule</div>
              <div style={{ fontSize: 13.5, marginTop: 10 }}>
                → <strong>{result.category}</strong>
              </div>
              <div style={{ fontSize: 12.5, color: "#6B7280", marginTop: 4 }}>
                Rule keyword <span style={{ fontFamily: "ui-monospace,monospace" }}>&quot;{result.rule.keyword}&quot;</span> · priority {result.rule.priority}{" "}
                · {result.rule.scope} · {result.rule.source}
              </div>
            </>
          ) : (
            <>
              <div style={s.badge("#FEF3C7", "#92400E")}>No rule matched</div>
              <div style={{ fontSize: 13.5, marginTop: 10 }}>
                → Falls back to <strong>{result.category}</strong>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
