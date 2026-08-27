-- Links a Supabase account row to the Mono account id it was linked from.
alter table public.accounts add column mono_account_id text unique;
