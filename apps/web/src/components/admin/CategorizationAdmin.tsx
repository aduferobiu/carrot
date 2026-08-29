"use client";

import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { tabBtn } from "./adminStyles";
import { RulesTab } from "./RulesTab";
import { SuggestionsTab } from "./SuggestionsTab";
import { PersonalRulesTab } from "./PersonalRulesTab";

type Tab = "rules" | "suggestions" | "personal";

export function CategorizationAdmin() {
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <AdminLayout title="Categorization engine" subtitle="Global rules and categories, cross-user suggestions, and per-user learned rules">
      <div style={{ display: "flex", gap: 6, marginBottom: 22, background: "#fff", border: "1px solid #E6E6EB", borderRadius: 12, padding: 5, width: "fit-content" }}>
        <button style={tabBtn(tab === "rules")} onClick={() => setTab("rules")}>
          Tab 1 — Rules &amp; Categories
        </button>
        <button style={tabBtn(tab === "suggestions")} onClick={() => setTab("suggestions")}>
          Tab 2 — Suggestions
        </button>
        <button style={tabBtn(tab === "personal")} onClick={() => setTab("personal")}>
          Tab 3 — Personal Rules
        </button>
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "suggestions" && <SuggestionsTab />}
      {tab === "personal" && <PersonalRulesTab />}
    </AdminLayout>
  );
}
