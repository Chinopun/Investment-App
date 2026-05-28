-- Investment Information App — initial schema
-- Run with: supabase db push

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- ---------- users ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  notify_time time not null default '07:00',
  tz text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

-- ---------- holdings ----------
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  ticker text not null,
  name text,
  shares numeric,
  cost_basis numeric,
  alert_breaking boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);
create index if not exists holdings_user_idx on public.holdings(user_id);

-- ---------- news_articles ----------
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  source text not null,
  url text not null,
  headline text not null,
  headline_hash text not null,
  body_snippet text,
  summary text,
  sentiment text check (sentiment in ('positive','negative','neutral')),
  impact_score int,                       -- 0..100, set by breaking-news-watcher
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (ticker, headline_hash)
);
create index if not exists news_ticker_pub_idx on public.news_articles(ticker, published_at desc);
create index if not exists news_pub_idx on public.news_articles(published_at desc);

-- ---------- daily_digests ----------
create table if not exists public.daily_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  digest_date date not null,
  body_md text not null,
  subject_line text not null,
  price_moves jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, digest_date)
);
create index if not exists digests_user_date_idx on public.daily_digests(user_id, digest_date desc);

-- ---------- alert_log ----------
create table if not exists public.alert_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  article_id uuid not null references public.news_articles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (user_id, article_id)
);

-- ---------- RLS ----------
alter table public.users enable row level security;
alter table public.holdings enable row level security;
alter table public.news_articles enable row level security;
alter table public.daily_digests enable row level security;
alter table public.alert_log enable row level security;

-- For a single-user personal app we authenticate via the anon key + a single user row.
-- These policies allow the anon role to read/write their own data identified by users.email.
-- Tighten this if you ever add real auth.
create policy "anon read users" on public.users for select to anon using (true);
create policy "anon read holdings" on public.holdings for select to anon using (true);
create policy "anon write holdings" on public.holdings for all to anon using (true) with check (true);
create policy "anon read news" on public.news_articles for select to anon using (true);
create policy "anon read digests" on public.daily_digests for select to anon using (true);

-- ---------- helper: ensure a default user exists ----------
-- After running migrations, insert your row once:
--   insert into public.users (email) values ('virojns@gmail.com') on conflict do nothing;
