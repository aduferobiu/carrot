-- Categorization engine: two-level category taxonomy, keyword rules, and a
-- correction/rule-learning feedback loop. This migration only changes schema
-- (columns, tables, constraints) — seeding the new taxonomy, remapping
-- existing budgets, and deleting the old flat categories all happen in a
-- follow-up Node script run with the service-role key, since those are pure
-- data operations that don't need direct DB access.

-- Existing rows currently have category_source = 'rule' (from Mono sync) or
-- possibly 'manual' (from a past correction). The old constraint only allows
-- those two values, so it has to be dropped before the rows can be remapped
-- to the new 3-value set — otherwise the UPDATE itself violates it.
alter table public.transactions drop constraint transactions_category_source_check;

update public.transactions
set category_source = case when category_source = 'manual' then 'user-corrected' else 'fallback' end;

alter table public.transactions
  add constraint transactions_category_source_check
  check (category_source in ('rule-matched', 'user-corrected', 'fallback'));
alter table public.transactions alter column category_source set default 'fallback';

alter table public.transactions add column normalized_description text;

-- Two-level taxonomy: parent_id null = top-level (parent) category.
alter table public.categories add column parent_id uuid references public.categories (id) on delete cascade;

create table public.categorization_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  keyword text not null,
  priority int not null default 100,
  source text not null check (source in ('seed', 'user_derived')),
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

create index categorization_rules_user_id_idx on public.categorization_rules (user_id);
-- Seed rules have user_id null, so the plain unique(user_id, keyword) above
-- doesn't stop duplicate seed keywords (NULL <> NULL in Postgres) — this
-- partial index covers that case.
create unique index categorization_rules_seed_keyword_idx on public.categorization_rules (keyword) where user_id is null;

alter table public.transactions add column matched_rule_id uuid references public.categorization_rules (id) on delete set null;

alter table public.categorization_rules enable row level security;

create policy "Users see seed rules and their own"
  on public.categorization_rules for select
  using (user_id is null or user_id = auth.uid());

create table public.transaction_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  normalized_description text not null,
  corrected_category_id uuid not null references public.categories (id),
  created_at timestamptz not null default now()
);

create index transaction_corrections_lookup_idx on public.transaction_corrections (user_id, normalized_description, corrected_category_id);

alter table public.transaction_corrections enable row level security;

create policy "Users see own corrections"
  on public.transaction_corrections for select
  using (auth.uid() = user_id);

-- Logs every fallback ("Others") categorisation for later keyword-gap review.
-- Written only by the server (service role); no user-facing policy needed.
create table public.uncategorized_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions (id) on delete cascade,
  normalized_description text not null,
  created_at timestamptz not null default now()
);

alter table public.uncategorized_log enable row level security;
