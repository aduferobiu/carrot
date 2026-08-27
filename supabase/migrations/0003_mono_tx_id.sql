-- Lets re-syncing a linked account's transactions upsert instead of duplicating.
alter table public.transactions add column mono_transaction_id text unique;
