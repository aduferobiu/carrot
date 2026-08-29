// Row shapes mirror the Supabase tables in supabase/migrations/0001_init.sql exactly
// (snake_case columns, as returned by supabase-js) — no client-side reshaping.

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  kind: "income" | "expense";
  icon: string;
  color: string;
  is_default: boolean;
  parent_id: string | null;
  is_active: boolean;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  institution_name: string | null;
  masked_number: string | null;
  balance: number;
  currency: string;
  mono_account_id: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string | null;
  raw_description: string | null;
  category_source: "rule-matched" | "user-corrected" | "fallback";
  occurred_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period_start: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  color: string | null;
  icon: string | null;
  is_read: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  account_id: string;
  merchant_label: string;
  category_id: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  average_amount: number;
  last_amount: number;
  first_seen_at: string;
  last_seen_at: string;
  predicted_next_charge_at: string | null;
  status: "active" | "dismissed" | "manual" | "needs_review";
  last_alerted_at: string | null;
  created_at: string;
};

export type HealthScoreComponent = {
  label: string;
  subScore: number;
  weight: number;
  note: string;
};

export type HealthScore =
  | { notEnoughData: true }
  | {
      notEnoughData: false;
      score: number;
      band: "Needs Attention" | "Fair" | "Good" | "Excellent";
      components: HealthScoreComponent[];
    };

// Deterministic presentation values derived from an account, not stored in the DB.
const ACCOUNT_GRADIENTS = [
  "linear-gradient(135deg,#F26B21,#C2410C)",
  "linear-gradient(135deg,#19C37D,#0E9E6A)",
  "linear-gradient(135deg,#7B3FE4,#4C1D95)",
  "linear-gradient(135deg,#3B2C8E,#1E1B4B)",
  "linear-gradient(135deg,#0353F4,#022B8A)",
  "linear-gradient(135deg,#DC2626,#7F1D1D)",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function accountCode(account: { name: string }): string {
  const words = account.name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return account.name.slice(0, 2).toUpperCase();
}

export function accountGradient(account: { id: string }): string {
  return ACCOUNT_GRADIENTS[hashString(account.id) % ACCOUNT_GRADIENTS.length];
}
