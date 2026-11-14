-- Private two-person test. Run in Supabase SQL Editor only for the private test.
-- Tables are deliberately inaccessible to browser anon/authenticated roles.
create table if not exists public.private_test_seats (
  seat smallint primary key check (seat in (1,2)),
  alias text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.private_test_messages (
  id bigint generated always as identity primary key,
  seat smallint not null references public.private_test_seats(seat),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.private_test_reports (
  id bigint generated always as identity primary key,
  reporter_seat smallint not null check (reporter_seat in (1,2)),
  message_id bigint,
  reason text not null check (char_length(reason) between 3 and 400),
  created_at timestamptz not null default now()
);
alter table public.private_test_seats enable row level security;
alter table public.private_test_messages enable row level security;
alter table public.private_test_reports enable row level security;
revoke all on public.private_test_seats, public.private_test_messages, public.private_test_reports from anon, authenticated;
create index if not exists private_test_messages_recent on public.private_test_messages(id desc);
-- Service role alone may access the tables; never add permissive browser policies.
