-- AnswerRank AI — Initial Database Schema
-- Created: May 2026
-- Run this in Supabase SQL Editor to set up tables + RLS policies

-- ─── Businesses Table ───────────────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  location text not null,
  industry text not null,
  competitors jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table businesses enable row level security;

create policy "users_own_businesses" on businesses
  for all using (auth.uid() = user_id);

create index idx_businesses_user_id on businesses(user_id);

-- ─── Scans Table ────────────────────────────────────────────────────────────
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  stripe_session_id text,
  tier text not null check (tier in ('one_time', 'monthly')),
  triggered_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table scans enable row level security;

create policy "users_own_scans" on scans
  for all using (auth.uid() = user_id);

create index idx_scans_user_id on scans(user_id);
create index idx_scans_status on scans(status);
create index idx_scans_business_id on scans(business_id);

-- ─── Reports Table ──────────────────────────────────────────────────────────
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  business_id uuid references businesses(id) on delete cascade not null,
  overall_score integer check (overall_score >= 0 and overall_score <= 100),
  platform_scores jsonb,
  score_components jsonb,
  competitor_data jsonb default '[]'::jsonb,
  sentiment_data jsonb default '[]'::jsonb,
  citation_sources jsonb default '[]'::jsonb,
  raw_results jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reports enable row level security;

create policy "users_own_reports" on reports
  for all using (auth.uid() = user_id);

create index idx_reports_scan_id on reports(scan_id);
create index idx_reports_user_id on reports(user_id);
create index idx_reports_business_id on reports(business_id);

-- ─── Fix Items Table ────────────────────────────────────────────────────────
create table if not exists fix_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade not null,
  priority integer not null check (priority >= 1 and priority <= 20),
  tag text not null check (tag in ('High Impact', 'Medium Impact', 'Foundational')),
  title text not null,
  why text not null,
  failure_mode text not null,
  created_at timestamptz default now()
);

alter table fix_items enable row level security;

create policy "users_own_fix_items" on fix_items
  for select using (
    exists (
      select 1 from reports
      where reports.id = fix_items.report_id
      and reports.user_id = auth.uid()
    )
  );

create index idx_fix_items_report_id on fix_items(report_id);

-- ─── Subscriptions Table ────────────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text not null check (tier in ('one_time', 'monthly', 'dfy')),
  status text default 'active' check (status in ('active', 'cancelled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "users_own_subscriptions" on subscriptions
  for all using (auth.uid() = user_id);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_subscription_id on subscriptions(stripe_subscription_id);

-- ─── Triggers for updated_at ────────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on businesses
  for each row execute procedure update_updated_at_column();

create trigger scans_updated_at before update on scans
  for each row execute procedure update_updated_at_column();

create trigger reports_updated_at before update on reports
  for each row execute procedure update_updated_at_column();

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute procedure update_updated_at_column();
