-- Explicit transaction membership for manually-created subscriptions
-- (status: 'manual'). Auto-detected ('active') subscriptions keep deriving
-- their transaction list live via (account_id, normalized_description) —
-- unaffected by this table.

create table public.subscription_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subscription_id, transaction_id)
);

create index subscription_transactions_subscription_id_idx on public.subscription_transactions (subscription_id);
create index subscription_transactions_user_id_idx on public.subscription_transactions (user_id);

alter table public.subscription_transactions enable row level security;

create policy "Users manage own subscription transactions"
  on public.subscription_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
