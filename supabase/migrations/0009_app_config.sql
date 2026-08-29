-- Super Admin module, phase 4 (AR-07): a generic key/value config table so
-- the thresholds and toggles the earlier phases hardcoded (suggestion and
-- personal-rule correction counts, the AR-04 aggregation mode, budget alert
-- percentages, Mono per-request pricing, a maintenance-mode switch) become
-- admin-editable without a code deployment. Seeded with exactly the values
-- already hardcoded elsewhere, so applying this migration changes nothing
-- about current behavior until an admin actually edits a value.

create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('budget_alert_thresholds', '{"warn": 80, "over": 100}'),
  ('suggestion_correction_threshold', '3'),
  ('suggestion_aggregation_mode', '"cross_user"'),
  ('personal_rule_correction_threshold', '3'),
  ('sync_frequency_hours', 'null'),
  ('mono_pricing', '{"account_auth": 0, "account_details": 0, "account_transactions": 0}'),
  ('mono_alert_thresholds', '{"failureRatePct": 20, "dailySpendNgn": 0}'),
  ('maintenance_mode', '{"enabled": false, "message": ""}');

-- Admin-only, read via the service role — RLS enabled with no policy, same
-- default-deny pattern as the other admin tables. The one value a
-- non-admin visitor needs (maintenance_mode) is exposed through a small
-- dedicated public route that reads this table server-side, rather than
-- opening any part of the table itself to the regular client.
alter table public.app_config enable row level security;
