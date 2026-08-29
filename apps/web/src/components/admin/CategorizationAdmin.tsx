"use client";

import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { tabBtn } from "./adminStyles";
import { CategoriesTab } from "./CategoriesTab";
import { RulesTab } from "./RulesTab";
import { SuggestionsTab } from "./SuggestionsTab";
import { PersonalRulesTab } from "./PersonalRulesTab";

type Tab = "categories" | "rules" | "suggestions" | "personal";

export function CategorizationAdmin() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <AdminLayout title="Categorization engine" subtitle="Global rules and categories, cross-user suggestions, and per-user learned rules">
      <div style={{ display: "flex", gap: 6, marginBottom: 22, background: "#fff", border: "1px solid #E6E6EB", borderRadius: 12, padding: 5, width: "fit-content" }}>
        <button style={tabBtn(tab === "categories")} onClick={() => setTab("categories")}>
          Categories
        </button>
        <button style={tabBtn(tab === "rules")} onClick={() => setTab("rules")}>
          Rules
        </button>
        <button style={tabBtn(tab === "suggestions")} onClick={() => setTab("suggestions")}>
          Suggestions
        </button>
        <button style={tabBtn(tab === "personal")} onClick={() => setTab("personal")}>
          Personal Rules
        </button>
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "suggestions" && <SuggestionsTab />}
      {tab === "personal" && <PersonalRulesTab />}
    </AdminLayout>
  );
}
