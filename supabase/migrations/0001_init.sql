-- Profiles: one row per auth user, created automatically on signup
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  currency text not null default 'NGN',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Accounts: linked banks/wallets. `type` is free text (e.g. Salary, Wallet,
-- Savings, Investment, Current) since bank-linked subtypes vary too much for a fixed enum.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  institution_name text,
  masked_number text,
  balance numeric(14, 2) not null default 0,
  currency text not null default 'NGN',
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "Users manage own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Categories: income/expense buckets. Rows with user_id null are shared defaults.
create type category_kind as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  kind category_kind not null,
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "Users see own and default categories"
  on public.categories for select
  using (auth.uid() = user_id or is_default);

create policy "Users insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

insert into public.categories (name, kind, icon, color, is_default) values
  ('Food & Groceries', 'expense', 'cart', '#16A34A', true),
  ('Transportation', 'expense', 'car', '#2563EB', true),
  ('Utilities', 'expense', 'zap', '#D97706', true),
  ('Entertainment', 'expense', 'play', '#DB2777', true),
  ('Healthcare', 'expense', 'health', '#DC2626', true),
  ('Education', 'expense', 'book', '#4F46E5', true),
  ('Shopping', 'expense', 'bag', '#9333EA', true),
  ('Transfers', 'expense', 'swap', '#64748B', true),
  ('Savings', 'expense', 'trend', '#0D9488', true),
  ('Worship', 'expense', 'building', '#7C3AED', true),
  ('Cash Withdrawal', 'expense', 'cash', '#EA580C', true),
  ('Income', 'income', 'income', '#059669', true),
  ('Others', 'expense', 'grid', '#6B7280', true);

-- Transactions: expenses/income against one account, transfers link two accounts
create type transaction_type as enum ('income', 'expense', 'transfer');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  transfer_account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  type transaction_type not null,
  amount numeric(14, 2) not null,
  description text,
  raw_description text,
  category_source text not null default 'rule' check (category_source in ('rule', 'manual')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_occurred_at_idx on public.transactions (occurred_at desc);

alter table public.transactions enable row level security;

create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budgets: a spending cap per category per month. `spent` is computed
-- client-side from transactions, not stored, to avoid drift.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(14, 2) not null,
  period_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, period_start)
);

create index budgets_user_id_idx on public.budgets (user_id);

alter table public.budgets enable row level security;

create policy "Users manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications: budget alerts, recurring-charge detections, account events
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  color text,
  icon text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy "Users manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
