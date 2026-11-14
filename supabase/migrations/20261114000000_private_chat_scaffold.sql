-- Safety-first schema scaffold. No permissive RLS policies are created.
create extension if not exists pgcrypto;
create table if not exists public.chat_visitors (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  age_passed boolean not null default false,
  age_checked_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint age_timestamp_required check (not age_passed or age_checked_at is not null)
);
create table if not exists public.chat_pairs (
  id uuid primary key default gen_random_uuid(),
  visitor_a uuid not null references public.chat_visitors(id),
  visitor_b uuid not null references public.chat_visitors(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint distinct_visitors check (visitor_a <> visitor_b)
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.chat_pairs(id),
  sender_id uuid not null references public.chat_visitors(id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.chat_visitors(id),
  reported_id uuid not null references public.chat_visitors(id),
  reason text not null check (char_length(reason) between 3 and 400),
  created_at timestamptz not null default now()
);
alter table public.chat_visitors enable row level security;
alter table public.chat_pairs enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;
revoke all on public.chat_visitors,public.chat_pairs,public.chat_messages,public.chat_reports from anon,authenticated;
-- Deliberately no policies. The public preview must not expose chat records.
