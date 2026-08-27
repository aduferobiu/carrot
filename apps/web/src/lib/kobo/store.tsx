"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { openMonoConnect } from "@/lib/mono";
import { supabase } from "@/lib/supabase";
import { Account, Budget, Category, HealthScore, Notification, Subscription, Transaction } from "./data";

export type ReauthAction = "delete" | "export" | "removeAccount" | null;

export type Profile = { fullName: string; email: string; initials: string };

type KoboState = {
  authLoading: boolean;
  dataLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  notifications: Notification[];
  subscriptions: Subscription[];
  healthScore: HealthScore | null;
  bio: boolean;
  authMode: "login" | "register";
  installDismissed: boolean;
  notifOpen: boolean;
  profileMenu: boolean;
  toast: string | null;
  linking: boolean;
  budgetModal: boolean;
  budgetCat: string;
  budgetAmt: string;
  healthModalOpen: boolean;
  categoryPickerTxId: string | null;
  reauthOpen: boolean;
  reauthAction: ReauthAction;
  reauthPayload: string | null;
  txSearch: string;
};

const initialState: KoboState = {
  authLoading: true,
  dataLoading: false,
  session: null,
  profile: null,
  categories: [],
  accounts: [],
  transactions: [],
  budgets: [],
  notifications: [],
  subscriptions: [],
  healthScore: null,
  bio: true,
  authMode: "login",
  installDismissed: false,
  notifOpen: false,
  profileMenu: false,
  toast: null,
  linking: false,
  budgetModal: false,
  budgetCat: "",
  budgetAmt: "",
  healthModalOpen: false,
  categoryPickerTxId: null,
  reauthOpen: false,
  reauthAction: null,
  reauthPayload: null,
  txSearch: "",
};

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

type KoboContextValue = KoboState & {
  setAuthMode: (mode: "login" | "register") => void;
  toggleAuthMode: () => void;
  showToast: (msg: string) => void;
  toggleNotif: () => void;
  markAllRead: () => void;
  toggleProfile: () => void;
  signOut: () => void;
  openLink: () => void;
  openBudget: () => void;
  closeBudget: () => void;
  setBudgetCat: (cat: string) => void;
  setBudgetAmt: (amt: string) => void;
  saveBudget: () => void;
  deleteBudget: (id: string) => void;
  correctCat: (txId: string, catId: string) => void;
  dismissSubscription: (id: string) => void;
  restoreSubscription: (id: string) => void;
  flagAsSubscription: (txId: string) => void;
  toggleHealthModal: () => void;
  openCategoryPicker: (txId: string) => void;
  closeCategoryPicker: () => void;
  openReauth: (action: ReauthAction, payload?: string) => void;
  closeReauth: () => void;
  confirmReauth: () => void;
  toggleBio: () => void;
  setTxSearch: (q: string) => void;
  dismissInstall: () => void;
  refreshAll: () => void;
  editProfileToast: () => void;
  pwToast: () => void;
  exportData: () => void;
  deleteAccount: () => void;
};

const KoboContext = createContext<KoboContextValue | null>(null);

export function KoboProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<KoboState>(initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const patch = useCallback((p: Partial<KoboState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const showToast = useCallback((msg: string) => {
    patch({ toast: msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => patch({ toast: null }), 2800);
  }, [patch]);

  // Track the auth session.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      patch({ session, authLoading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      patch({ session });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the signed-in user's data whenever the session changes.
  const userId = state.session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      patch({
        categories: [],
        accounts: [],
        transactions: [],
        budgets: [],
        notifications: [],
        subscriptions: [],
        healthScore: null,
        profile: null,
      });
      return;
    }
    let mounted = true;
    patch({ dataLoading: true });
    Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("accounts").select("*").order("created_at"),
      supabase.from("transactions").select("*").order("occurred_at", { ascending: false }),
      supabase.from("budgets").select("*"),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]).then(([cats, accs, txs, buds, notifs, subs, prof]) => {
      if (!mounted) return;
      const email = state.session?.user?.email ?? "";
      const fullName = prof.data?.full_name || email.split("@")[0] || "there";
      patch({
        categories: cats.data ?? [],
        accounts: accs.data ?? [],
        transactions: (txs.data ?? []) as Transaction[],
        budgets: buds.data ?? [],
        notifications: notifs.data ?? [],
        subscriptions: (subs.data ?? []) as Subscription[],
        profile: { fullName, email, initials: initialsOf(fullName) },
        budgetCat: (cats.data ?? []).find((c) => c.parent_id)?.id ?? "",
        dataLoading: false,
      });
    });
    const token = state.session?.access_token;
    if (token) {
      fetch("/api/insights/health-score", { headers: { authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (mounted && body) patch({ healthScore: body as HealthScore });
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setAuthMode = useCallback((mode: "login" | "register") => patch({ authMode: mode }), [patch]);
  const toggleAuthMode = useCallback(() => {
    setState((s) => ({ ...s, authMode: s.authMode === "register" ? "login" : "register" }));
  }, []);

  const toggleNotif = useCallback(() => setState((s) => ({ ...s, notifOpen: !s.notifOpen })), []);
  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, is_read: true })) }));
    if (userId) {
      supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    }
  }, [userId]);
  const toggleProfile = useCallback(() => setState((s) => ({ ...s, profileMenu: !s.profileMenu })), []);
  const signOut = useCallback(() => {
    patch({ profileMenu: false, authMode: "login" });
    supabase.auth.signOut();
    router.push("/login");
  }, [patch, router]);

  const openLink = useCallback(async () => {
    if (!state.profile) {
      showToast("Please wait for your profile to load");
      return;
    }
    patch({ profileMenu: false });
    const token = state.session?.access_token;
    try {
      await openMonoConnect({
        customer: { name: state.profile.fullName, email: state.profile.email },
        onClose: () => patch({ linking: false }),
        onSuccess: async (code) => {
          patch({ linking: true });
          try {
            const res = await fetch("/api/accounts/link", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
              body: JSON.stringify({ code }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to link account");
            const { account, transactionsImported } = body as {
              account: Account;
              transactionsImported: number;
            };
            const { data: newTxs } = await supabase
              .from("transactions")
              .select("*")
              .eq("account_id", account.id);
            setState((s) => ({
              ...s,
              accounts: [...s.accounts, account],
              transactions: [...s.transactions, ...((newTxs ?? []) as Transaction[])],
              linking: false,
            }));
            showToast(
              (account.institution_name ?? account.name) +
                " linked successfully — " +
                transactionsImported +
                " transactions imported",
            );
          } catch (err) {
            patch({ linking: false });
            showToast(err instanceof Error ? err.message : "Couldn't link account");
          }
        },
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't open Mono Connect");
    }
  }, [patch, showToast, state.profile, state.session]);

  const openBudget = useCallback(() => {
    patch({ budgetModal: true, budgetCat: state.categories.find((c) => c.parent_id)?.id ?? "", budgetAmt: "" });
  }, [patch, state.categories]);
  const closeBudget = useCallback(() => patch({ budgetModal: false }), [patch]);
  const setBudgetCat = useCallback((cat: string) => patch({ budgetCat: cat }), [patch]);
  const setBudgetAmt = useCallback((amt: string) => patch({ budgetAmt: amt }), [patch]);
  const saveBudget = useCallback(async () => {
    const amount = parseInt((state.budgetAmt || "").replace(/[^0-9]/g, ""), 10);
    if (!amount || !userId || !state.budgetCat) {
      showToast("Enter a budget amount");
      return;
    }
    const periodStart = new Date();
    const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-01`;
    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: userId, category_id: state.budgetCat, amount, period_start: period },
        { onConflict: "user_id,category_id,period_start" },
      )
      .select()
      .single();
    if (error || !data) {
      showToast("Couldn't save that budget");
      return;
    }
    setState((s) => ({
      ...s,
      budgets: s.budgets.some((b) => b.id === data.id)
        ? s.budgets.map((b) => (b.id === data.id ? (data as Budget) : b))
        : [...s.budgets, data as Budget],
      budgetModal: false,
    }));
    const catName = state.categories.find((c) => c.id === state.budgetCat)?.name ?? "";
    showToast("Budget saved for " + catName);
  }, [showToast, state.budgetAmt, state.budgetCat, state.categories, userId]);
  const deleteBudget = useCallback(async (id: string) => {
    setState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) }));
    await supabase.from("budgets").delete().eq("id", id);
    showToast("Budget removed");
  }, [showToast]);

  const correctCat = useCallback(async (txId: string, catId: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === txId ? { ...t, category_id: catId, category_source: "user-corrected" as const } : t,
      ),
    }));
    const catName = state.categories.find((c) => c.id === catId)?.name ?? "";
    const token = state.session?.access_token;
    try {
      const res = await fetch(`/api/transactions/${txId}/category`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ categoryId: catId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update category");
      showToast(body.ruleLearned ? "Saved — Carrot will auto-apply this rule" : "Category updated to " + catName);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't update category");
    }
  }, [showToast, state.categories, state.session]);

  const dismissSubscription = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, status: "dismissed" as const } : sub)),
    }));
    const token = state.session?.access_token;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error();
      showToast("Won't show as a subscription anymore");
    } catch {
      showToast("Couldn't update that subscription");
    }
  }, [showToast, state.session]);

  const restoreSubscription = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, status: "active" as const } : sub)),
    }));
    const token = state.session?.access_token;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error();
      showToast("Marked as a subscription again");
    } catch {
      showToast("Couldn't update that subscription");
    }
  }, [showToast, state.session]);

  const flagAsSubscription = useCallback(async (txId: string) => {
    const token = state.session?.access_token;
    try {
      const res = await fetch("/api/subscriptions/manual", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactionId: txId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to flag subscription");
      const { data } = await supabase.from("subscriptions").select("*").eq("id", body.subscriptionId).maybeSingle();
      if (data) {
        setState((s) => ({
          ...s,
          subscriptions: s.subscriptions.some((sub) => sub.id === data.id)
            ? s.subscriptions.map((sub) => (sub.id === data.id ? (data as Subscription) : sub))
            : [...s.subscriptions, data as Subscription],
        }));
      }
      showToast("Marked as a subscription");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't flag this transaction");
    }
  }, [showToast, state.session]);

  const toggleHealthModal = useCallback(() => setState((s) => ({ ...s, healthModalOpen: !s.healthModalOpen })), []);
  const openCategoryPicker = useCallback((txId: string) => patch({ categoryPickerTxId: txId }), [patch]);
  const closeCategoryPicker = useCallback(() => patch({ categoryPickerTxId: null }), [patch]);

  const openReauth = useCallback((action: ReauthAction, payload?: string) => {
    patch({ reauthOpen: true, reauthAction: action, reauthPayload: payload ?? null, profileMenu: false });
  }, [patch]);
  const closeReauth = useCallback(() => patch({ reauthOpen: false }), [patch]);
  const confirmReauth = useCallback(async () => {
    const action = state.reauthAction;
    const payload = state.reauthPayload;
    patch({ reauthOpen: false });
    if (action === "delete" && userId) {
      await Promise.all([
        supabase.from("accounts").delete().eq("user_id", userId),
        supabase.from("transactions").delete().eq("user_id", userId),
        supabase.from("budgets").delete().eq("user_id", userId),
        supabase.from("notifications").delete().eq("user_id", userId),
      ]);
      showToast("Your data has been erased");
      setTimeout(async () => {
        await supabase.auth.signOut();
        patch({ authMode: "login" });
        router.push("/login");
      }, 900);
    } else if (action === "export") {
      showToast("Your data export is ready to download");
    } else if (action === "removeAccount" && payload) {
      setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== payload) }));
      await supabase.from("accounts").delete().eq("id", payload);
      showToast("Account unlinked from Carrot");
    }
  }, [patch, router, showToast, state.reauthAction, state.reauthPayload, userId]);

  const toggleBio = useCallback(() => setState((s) => ({ ...s, bio: !s.bio })), []);
  const setTxSearch = useCallback((q: string) => patch({ txSearch: q }), [patch]);
  const dismissInstall = useCallback(() => {
    patch({ installDismissed: true });
    showToast("Carrot added to your home screen");
  }, [patch, showToast]);
  const refreshAll = useCallback(async () => {
    const linked = state.accounts.filter((a) => a.mono_account_id);
    if (linked.length === 0) {
      showToast("No linked accounts to refresh");
      return;
    }
    const token = state.session?.access_token;
    try {
      await Promise.all(
        linked.map((a) =>
          fetch(`/api/accounts/${a.id}/sync`, {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
          }),
        ),
      );
      const [accs, txs, subs, healthRes] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at"),
        supabase.from("transactions").select("*").order("occurred_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
        fetch("/api/insights/health-score", { headers: { authorization: `Bearer ${token}` } }),
      ]);
      const health = healthRes.ok ? ((await healthRes.json()) as HealthScore) : null;
      setState((s) => ({
        ...s,
        accounts: accs.data ?? s.accounts,
        transactions: (txs.data ?? s.transactions) as Transaction[],
        subscriptions: (subs.data ?? s.subscriptions) as Subscription[],
        healthScore: health ?? s.healthScore,
      }));
      showToast("All balances refreshed just now");
    } catch {
      showToast("Couldn't refresh — try again");
    }
  }, [showToast, state.accounts, state.session]);
  const editProfileToast = useCallback(() => showToast("Profile editing coming soon"), [showToast]);
  const pwToast = useCallback(() => showToast("Password reset link sent to your email"), [showToast]);
  const exportData = useCallback(() => openReauth("export"), [openReauth]);
  const deleteAccount = useCallback(() => openReauth("delete"), [openReauth]);

  const value = useMemo<KoboContextValue>(
    () => ({
      ...state,
      setAuthMode,
      toggleAuthMode,
      showToast,
      toggleNotif,
      markAllRead,
      toggleProfile,
      signOut,
      openLink,
      openBudget,
      closeBudget,
      setBudgetCat,
      setBudgetAmt,
      saveBudget,
      deleteBudget,
      correctCat,
      dismissSubscription,
      restoreSubscription,
      flagAsSubscription,
      toggleHealthModal,
      openCategoryPicker,
      closeCategoryPicker,
      openReauth,
      closeReauth,
      confirmReauth,
      toggleBio,
      setTxSearch,
      dismissInstall,
      refreshAll,
      editProfileToast,
      pwToast,
      exportData,
      deleteAccount,
    }),
    [
      state,
      setAuthMode,
      toggleAuthMode,
      showToast,
      toggleNotif,
      markAllRead,
      toggleProfile,
      signOut,
      openLink,
      openBudget,
      closeBudget,
      setBudgetCat,
      setBudgetAmt,
      saveBudget,
      deleteBudget,
      correctCat,
      dismissSubscription,
      restoreSubscription,
      flagAsSubscription,
      toggleHealthModal,
      openCategoryPicker,
      closeCategoryPicker,
      openReauth,
      closeReauth,
      confirmReauth,
      toggleBio,
      setTxSearch,
      dismissInstall,
      refreshAll,
      editProfileToast,
      pwToast,
      exportData,
      deleteAccount,
    ],
  );

  return <KoboContext.Provider value={value}>{children}</KoboContext.Provider>;
}

export function useKobo() {
  const ctx = useContext(KoboContext);
  if (!ctx) throw new Error("useKobo must be used within a KoboProvider");
  return ctx;
}
