-- Super Admin module, phase 1 (AR-03/04/05): soft-disable for categories,
-- status tracking for rules (needed for Tab 1's disable action and Tab 3's
-- per-user rule disable), and a global-suggestion queue that is distinct
-- from the existing per-user auto-learned rule path in ruleLearning.ts —
-- a suggestion here has zero effect on live categorization until an admin
-- explicitly approves or restricts it (AR-04).
--
-- AR-01's audit log is a later phase in full (viewing/filtering UI), but
-- NFR-A3 requires every state-changing admin action be audited with no
-- exceptions starting now, so the write-side table is included here rather
-- than retrofitted once AR-01 actually starts.

alter table public.categories add column is_active boolean not null default true;

alter table public.categorization_rules
  add column status text not null default 'active' check (status in ('active', 'disabled'));

-- AR-05 wants a personal rule's origin distinguishable as "auto-learned
-- directly" vs. "restricted here from a Tab 2 suggestion" — widen the
-- existing seed/user_derived constraint to add the latter.
alter table public.categorization_rules drop constraint categorization_rules_source_check;
alter table public.categorization_rules
  add constraint categorization_rules_source_check check (source in ('seed', 'user_derived', 'restricted_suggestion'));

-- A pending (or resolved) global suggestion, keyed one-per-pattern so a
-- rejected pattern isn't silently re-suggested on the next detection pass —
-- see AR-04's "must not be re-suggested unless the admin explicitly clears
-- the rejection" requirement.
create table public.categorization_suggestions (
  id uuid primary key default gen_random_uuid(),
  normalized_description text not null,
  proposed_category_id uuid not null references public.categories (id) on delete cascade,
  correction_count int not null,
  sample_descriptions text[] not null default '{}',
  contributing_user_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved_global', 'restricted', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (normalized_description)
);

create index categorization_suggestions_status_idx on public.categorization_suggestions (status);

-- Written and read exclusively by admin-gated server code on the
-- service-role key — RLS is enabled with no policy (default-deny) purely as
-- defense in depth, matching uncategorized_log's existing pattern, since the
-- regular client should never be able to reach this table under any key.
alter table public.categorization_suggestions enable row level security;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action_type text not null,
  target_entity text not null,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
