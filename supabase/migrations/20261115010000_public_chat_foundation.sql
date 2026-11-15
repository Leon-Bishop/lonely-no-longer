-- Public chat foundation: SCHEMA ONLY. No public endpoints, no age assurance bypass.
-- Review and apply manually in Supabase SQL Editor when ready.
create table if not exists public.public_chat_sessions (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (length(token_hash)=64),
 age_verified_at timestamptz not null,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 constraint session_expiry check (expires_at > created_at)
);
create table if not exists public.public_chat_rooms (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 closed_at timestamptz
);
create table if not exists public.public_chat_members (
 room_id uuid not null references public.public_chat_rooms(id) on delete cascade,
 session_id uuid not null references public.public_chat_sessions(id) on delete cascade,
 joined_at timestamptz not null default now(),
 left_at timestamptz,
 primary key(room_id,session_id)
);
create unique index if not exists one_active_room_per_session
 on public.public_chat_members(session_id) where left_at is null;
create table if not exists public.public_chat_messages (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.public_chat_rooms(id) on delete cascade,
 sender_session_id uuid not null references public.public_chat_sessions(id),
 body text not null check (char_length(body) between 1 and 500),
 created_at timestamptz not null default now()
);
create index if not exists public_chat_messages_room_recent on public.public_chat_messages(room_id,id desc);
create table if not exists public.public_chat_reports (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.public_chat_rooms(id),
 message_id bigint references public.public_chat_messages(id),
 reporter_session_id uuid not null references public.public_chat_sessions(id),
 reason text not null check (char_length(reason) between 3 and 400),
 status text not null default 'pending' check (status in ('pending','reviewing','resolved')),
 created_at timestamptz not null default now()
);
-- No browser or logged-in user has direct access; future API must enforce membership.
alter table public.public_chat_sessions enable row level security;
alter table public.public_chat_rooms enable row level security;
alter table public.public_chat_members enable row level security;
alter table public.public_chat_messages enable row level security;
alter table public.public_chat_reports enable row level security;
revoke all on public.public_chat_sessions, public.public_chat_rooms, public.public_chat_members, public.public_chat_messages, public.public_chat_reports from anon, authenticated;
revoke all on sequence public.public_chat_messages_id_seq, public.public_chat_reports_id_seq from anon, authenticated;
-- No RLS allow policies: service-role-only access pending audited server-side API.
-- IMPORTANT: A room must have at most 2 members; enforce in the future atomic
-- matchmaking transaction before enabling any public API.
-- Do not put raw session tokens or age verification provider data in these tables.
