-- Lets a user rename a subscription's auto-detected label (e.g. a garbled
-- POS description) without touching the underlying merchant_label used for
-- transaction grouping / re-detection matching.

alter table public.subscriptions add column display_name text;
