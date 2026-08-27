import { supabase } from "../supabase";

export type HealthScoreComponent = {
  label: string;
  subScore: number;
  weight: number;
  note: string;
};

export type HealthScoreBand = "Needs Attention" | "Fair" | "Good" | "Excellent";

export type HealthScoreResult =
  | { notEnoughData: true }
  | {
      notEnoughData: false;
      score: number;
      band: HealthScoreBand;
      components: HealthScoreComponent[];
    };

function bandFor(score: number): HealthScoreBand {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ratio 0→0.5 maps to 0–50, 0.5→1.0 maps to 50–80, 1.0→2.0 maps to 80–100.
function incomeExpenseSubScore(ratio: number): number {
  const capped = Math.min(ratio, 2.0);
  if (capped <= 0.5) return (capped / 0.5) * 50;
  if (capped <= 1.0) return 50 + ((capped - 0.5) / 0.5) * 30;
  return 80 + ((capped - 1.0) / 1.0) * 20;
}

// 0% → 0, 20%+ → 100, linear between.
function savingsSubScore(rate: number): number {
  return Math.min(100, Math.max(0, (rate / 0.2) * 100));
}

export async function computeHealthScore(userId: string): Promise<HealthScoreResult> {
  const { data: earliestTx } = await supabase
    .from("transactions")
    .select("occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!earliestTx) return { notEnoughData: true };
  const daysOfHistory = (Date.now() - new Date(earliestTx.occurred_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOfHistory < 7) return { notEnoughData: true };

  const monthStart = currentMonthStart();
  const { data: monthTxs } = await supabase
    .from("transactions")
    .select("type, amount, category_id")
    .eq("user_id", userId)
    .gte("occurred_at", monthStart);

  const txs = monthTxs ?? [];
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);

  const ratio = expense > 0 ? income / expense : income > 0 ? 2 : 0;
  const incomeExpenseScore = incomeExpenseSubScore(ratio);

  const { data: savingsParent } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Savings & Investments")
    .is("parent_id", null)
    .maybeSingle();
  const savingsCategoryIds = new Set<string>();
  if (savingsParent) {
    const { data: savingsLeaves } = await supabase.from("categories").select("id").eq("parent_id", savingsParent.id);
    for (const l of savingsLeaves ?? []) savingsCategoryIds.add(l.id);
  }
  const savingsExpense = txs
    .filter((t) => t.type === "expense" && t.category_id && savingsCategoryIds.has(t.category_id))
    .reduce((a, t) => a + Number(t.amount), 0);
  const savingsRate = income > 0 ? savingsExpense / income : 0;
  const savingsScore = savingsSubScore(savingsRate);

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, category_id, amount, period_start")
    .eq("user_id", userId)
    .eq("period_start", monthStart);

  let budgetScore: number | null = null;
  let budgetNote = "No budgets set this month — score based on income/expense and savings only.";
  if (budgets && budgets.length > 0) {
    const { data: budgetMonthTxs } = await supabase
      .from("transactions")
      .select("category_id, amount, type, occurred_at")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("occurred_at", monthStart);
    let withinCap = 0;
    for (const b of budgets) {
      const spent = (budgetMonthTxs ?? [])
        .filter((t) => t.category_id === b.category_id)
        .reduce((a, t) => a + Number(t.amount), 0);
      if (spent <= Number(b.amount)) withinCap++;
    }
    budgetScore = (withinCap / budgets.length) * 100;
    budgetNote = `${withinCap} of ${budgets.length} budgets are within their cap this month.`;
  }

  const weights =
    budgetScore === null
      ? { incomeExpense: 40 / 65, savings: 25 / 65, budget: 0 }
      : { incomeExpense: 0.4, savings: 0.25, budget: 0.35 };

  const score = Math.round(
    incomeExpenseScore * weights.incomeExpense +
      savingsScore * weights.savings +
      (budgetScore ?? 0) * weights.budget,
  );

  const components: HealthScoreComponent[] = [
    {
      label: "Income vs. expenses",
      subScore: Math.round(incomeExpenseScore),
      weight: Math.round(weights.incomeExpense * 100),
      note:
        expense > 0
          ? `You earned ${(ratio * 100).toFixed(0)}% of what you spent this month.`
          : "No expenses recorded yet this month.",
    },
    {
      label: "Savings rate",
      subScore: Math.round(savingsScore),
      weight: Math.round(weights.savings * 100),
      note: `${(savingsRate * 100).toFixed(0)}% of your income went to savings this month.`,
    },
  ];
  if (budgetScore !== null) {
    components.splice(1, 0, {
      label: "Budget adherence",
      subScore: Math.round(budgetScore),
      weight: Math.round(weights.budget * 100),
      note: budgetNote,
    });
  } else {
    components.push({ label: "Budget adherence", subScore: 0, weight: 0, note: budgetNote });
  }

  return { notEnoughData: false, score, band: bandFor(score), components };
}
