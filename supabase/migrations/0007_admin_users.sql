-- Super Admin module, phase 2 (AR-01/AR-02): audit log viewing needs no
-- schema change (the table already exists from 0006). AR-02's per-user
-- account-health signals (failed sync attempts, last successful sync,
-- error state) need new columns — nothing currently tracks sync outcomes
-- at all; syncTransactions() has always swallowed a Mono fetch failure
-- silently and returned 0, indistinguishable from "genuinely nothing new."

alter table public.accounts add column last_synced_at timestamptz;
alter table public.accounts add column last_sync_error text;
alter table public.accounts add column failed_sync_count int not null default 0;
