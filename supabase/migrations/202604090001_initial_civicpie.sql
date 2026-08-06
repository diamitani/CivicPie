create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.community_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  full_name text,
  address_text text,
  zip_code text,
  ward_number integer check (ward_number between 1 and 50),
  topics text[] not null default '{}',
  digest_frequencies text[] not null default '{}',
  source_preferences jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'unsubscribed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.civic_sources (
  source_id text primary key,
  title text not null,
  jurisdiction text not null,
  source_type text not null,
  url text not null unique,
  ward_number integer,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.civic_items (
  item_key text primary key,
  source_id text not null references public.civic_sources(source_id) on delete cascade,
  title text not null,
  summary text,
  category text not null,
  url text not null unique,
  raw_date_text text,
  confidence numeric(4,2) not null default 0.50,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  discovered_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scrape_runs (
  run_key text primary key,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'running',
  output_dir text,
  source_count integer not null default 0,
  item_count integer not null default 0,
  used_playwright boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reconcile_diffs (
  diff_key text primary key,
  run_key text not null references public.scrape_runs(run_key) on delete cascade,
  source_id text,
  diff_type text not null,
  old_value text,
  new_value text,
  severity text not null default 'medium',
  reviewed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_community_subscriptions_ward_number
  on public.community_subscriptions (ward_number);

create index if not exists idx_civic_sources_ward_number
  on public.civic_sources (ward_number);

create index if not exists idx_civic_items_category
  on public.civic_items (category);

create index if not exists idx_civic_items_source_id
  on public.civic_items (source_id);

drop trigger if exists trg_community_subscriptions_updated_at on public.community_subscriptions;
create trigger trg_community_subscriptions_updated_at
before update on public.community_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_civic_sources_updated_at on public.civic_sources;
create trigger trg_civic_sources_updated_at
before update on public.civic_sources
for each row
execute function public.set_updated_at();
