-- Super Admin module, phase 3 (AR-06): logs every call made to Mono, tagged
-- by endpoint and outcome, so admin can see call volume, estimated cost, and
-- failure rate over time. Written and read exclusively by server-side code
-- on the service-role key — same RLS-enabled-with-no-policy pattern as the
-- other admin-only tables, never touched by the regular client.

create table public.mono_api_calls (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null check (endpoint in ('account_auth', 'account_details', 'account_transactions')),
  outcome text not null check (outcome in ('success', 'failure')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create index mono_api_calls_created_at_idx on public.mono_api_calls (created_at desc);
create index mono_api_calls_endpoint_idx on public.mono_api_calls (endpoint);

alter table public.mono_api_calls enable row level security;
