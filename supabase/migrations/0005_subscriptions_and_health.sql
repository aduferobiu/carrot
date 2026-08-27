-- Subscription tracking: detected recurring debit groups, upserted by the
-- account-sync pass (there's no cron/queue in this app, so detection piggy-
-- backs on the same flow that already runs categorization on sync).

create type subscription_frequency as enum ('weekly', 'monthly', 'yearly');
create type subscription_status as enum ('active', 'dismissed', 'manual', 'needs_review');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  merchant_label text not null,
  category_id uuid references public.categories (id) on delete set null,
  frequency subscription_frequency not null,
  average_amount numeric(14, 2) not null,
  last_amount numeric(14, 2) not null,
  first_seen_at date not null,
  last_seen_at date not null,
  predicted_next_charge_at date,
  status subscription_status not null default 'active',
  last_alerted_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id, merchant_label)
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "Users manage own subscriptions"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
