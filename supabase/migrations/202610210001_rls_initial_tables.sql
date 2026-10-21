-- 202610210001_rls_initial_tables.sql
-- QA fix (2026-10-21, finding c7): the initial migration created five
-- tables with no row level security and no policies. Nothing here has
-- been applied yet; this migration closes the gap for whenever the
-- Supabase schema is stood up.
--
-- Posture: RLS ON with NO permissive policies. That denies anon and
-- authenticated access by default; the service role (server-side loaders)
-- bypasses RLS. community_subscriptions may hold subscriber emails, so
-- it deliberately gets no public policy — add a narrowly scoped policy
-- in a future migration if a public subscribe flow ever needs one.

alter table public.community_subscriptions enable row level security;
alter table public.civic_sources enable row level security;
alter table public.civic_items enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.reconcile_diffs enable row level security;
