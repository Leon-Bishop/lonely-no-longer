-- Phase 1 public chat workflow. REVIEW/STAGE ONLY; no change to live switches.
-- Existing age_verified_at is kept for future genuine age assurance. A self-declaration
-- is stored separately; it MUST NOT be represented as independent verification.
alter table public.public_chat_sessions alter column age_verified_at drop not null;
alter table public.public_chat_sessions
  add column if not exists age_declared_at timestamptz,
  add column if not exists rules_accepted_at timestamptz,
  add column if not exists ip_hash text,
  add column if not exists last_peer_session_id uuid references public.public_chat_sessions(id);
alter table public.public_chat_sessions
  add constraint public_chat_session_ip_hash_format
  check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$');

create table if not exists public.public_chat_waiting (
  session_id uuid primary key references public.public_chat_sessions(id) on delete cascade,
  enqueued_at timestamptz not null default now()
);
create index if not exists public_chat_waiting_oldest on public.public_chat_waiting(enqueued_at);
alter table public.public_chat_waiting enable row level security;
revoke all on public.public_chat_waiting from public, anon, authenticated;

-- Defence in depth: a room cannot contain more than two members, even if
-- a future code path inserts outside the matchmaking routine.
create or replace function public.public_chat_limit_room_members()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.public_chat_rooms where id=new.room_id for update;
  if (select count(*) from public.public_chat_members where room_id=new.room_id) >= 2
  then raise exception 'Room is full'; end if;
  return new;
end $$;
drop trigger if exists public_chat_room_member_limit on public.public_chat_members;
create trigger public_chat_room_member_limit before insert on public.public_chat_members
for each row execute function public.public_chat_limit_room_members();
revoke all on function public.public_chat_limit_room_members() from public,anon,authenticated;

create or replace function public.public_chat_begin(p_token_hash text,p_ip_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_ip_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'Invalid session'; end if;
  -- Limited protection while a dedicated edge rate-limiter is built in Phase 2.
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 1));
  if (select count(*) from public.public_chat_sessions
      where ip_hash=p_ip_hash and revoked_at is null and expires_at>now()) >= 3
  then raise exception 'Too many active sessions'; end if;
  insert into public.public_chat_sessions(token_hash,age_declared_at,rules_accepted_at,ip_hash,expires_at)
  values(p_token_hash,now(),now(),p_ip_hash,now()+interval '1 hour') returning id into v_id;
  return v_id;
end $$;

create or replace function public.public_chat_match(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.public_chat_sessions%rowtype;
        v_peer uuid; v_room uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  -- Serialize ALL match/leave transitions so no session enters two rooms.
  perform pg_advisory_xact_lock(7647218349);
  select * into v_request from public.public_chat_sessions where id=p_session_id for update;
  if not found or v_request.revoked_at is not null or v_request.expires_at<=now()
     or v_request.age_declared_at is null or v_request.rules_accepted_at is null
  then raise exception 'Session unavailable'; end if;
  select m.room_id into v_room from public.public_chat_members m
  join public.public_chat_rooms r on r.id=m.room_id
  where m.session_id=p_session_id and m.left_at is null and r.closed_at is null limit 1;
  if v_room is not null then
    return jsonb_build_object('state','connected','room_id',v_room);
  end if;
  delete from public.public_chat_waiting w where w.session_id in (
    select s.id from public.public_chat_sessions s
    where s.expires_at<=now() or s.revoked_at is not null);
  select w.session_id into v_peer from public.public_chat_waiting w
  join public.public_chat_sessions s on s.id=w.session_id
  where w.session_id<>p_session_id and s.revoked_at is null
    and s.expires_at>now() and s.age_declared_at is not null
    and s.rules_accepted_at is not null and s.ip_hash<>v_request.ip_hash
    and s.id is distinct from v_request.last_peer_session_id
    and s.last_peer_session_id is distinct from p_session_id
    and not exists (
      select 1 from public.public_chat_members m
      join public.public_chat_rooms r on r.id=m.room_id
      where m.session_id=s.id and m.left_at is null and r.closed_at is null)
  order by w.enqueued_at
  for update of w,s skip locked limit 1;
  if v_peer is null then
    insert into public.public_chat_waiting(session_id) values(p_session_id)
    on conflict(session_id) do nothing;
    return jsonb_build_object('state','waiting');
  end if;
  insert into public.public_chat_rooms default values returning id into v_room;
  insert into public.public_chat_members(room_id,session_id)
    values(v_room,p_session_id),(v_room,v_peer);
  update public.public_chat_sessions set last_peer_session_id=
    case when id=p_session_id then v_peer else p_session_id end
  where id in (p_session_id,v_peer);
  delete from public.public_chat_waiting where session_id in (p_session_id,v_peer);
  return jsonb_build_object('state','connected','room_id',v_room);
end $$;

create or replace function public.public_chat_leave(p_session_id uuid,p_end boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_room uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  perform pg_advisory_xact_lock(7647218349);
  perform 1 from public.public_chat_sessions where id=p_session_id for update;
  if not found then return false; end if;
  delete from public.public_chat_waiting where session_id=p_session_id;
  select m.room_id into v_room from public.public_chat_members m
  where m.session_id=p_session_id and m.left_at is null limit 1;
  if v_room is not null then
    update public.public_chat_rooms set closed_at=coalesce(closed_at,now()) where id=v_room;
    update public.public_chat_members set left_at=coalesce(left_at,now())
      where room_id=v_room and left_at is null;
  end if;
  if p_end then
    update public.public_chat_sessions set revoked_at=coalesce(revoked_at,now())
      where id=p_session_id;
  end if;
  return true;
end $$;

create or replace function public.public_chat_state(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if not exists(select 1 from public.public_chat_sessions s where s.id=p_session_id
      and s.revoked_at is null and s.expires_at>now() and s.age_declared_at is not null
      and s.rules_accepted_at is not null)
  then return jsonb_build_object('state','ended'); end if;
  select m.room_id into v_room from public.public_chat_members m
  join public.public_chat_rooms r on r.id=m.room_id
  where m.session_id=p_session_id and m.left_at is null and r.closed_at is null limit 1;
  if v_room is not null then
    return jsonb_build_object('state','connected','room_id',v_room);
  end if;
  if exists(select 1 from public.public_chat_waiting where session_id=p_session_id)
  then return jsonb_build_object('state','waiting'); end if;
  return jsonb_build_object('state','ended');
end $$;

create or replace function public.public_chat_read(p_session_id uuid,p_room_id uuid,p_after_id bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_messages jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_after_id<0 then raise exception 'Invalid cursor'; end if;
  if not exists(select 1 from public.public_chat_sessions s
    join public.public_chat_members m on m.session_id=s.id
    join public.public_chat_rooms r on r.id=m.room_id
    where s.id=p_session_id and m.room_id=p_room_id and m.left_at is null
      and r.closed_at is null and s.revoked_at is null and s.expires_at>now()
      and s.age_declared_at is not null and s.rules_accepted_at is not null)
  then raise exception 'Conversation unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',z.id,'body',z.body,'mine',z.sender_session_id=p_session_id,'created_at',z.created_at)
    order by z.id),'[]'::jsonb) into v_messages
  from (select id,body,sender_session_id,created_at from public.public_chat_messages
    where room_id=p_room_id and id>p_after_id order by id limit 50) z;
  return v_messages;
end $$;

-- Compare the last seen message under a room lock so two simultaneous sends
-- cannot change the context used to moderate an under-18 age reply.
create or replace function public.public_chat_safe_insert_v2(
  p_session_id uuid,p_room_id uuid,p_body text,p_expected_latest_id bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_id bigint; v_latest bigint;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_expected_latest_id<0 or char_length(p_body) not between 1 and 500
  then raise exception 'Invalid message'; end if;
  perform 1 from public.public_chat_sessions s where s.id=p_session_id
    and s.revoked_at is null and s.expires_at>now() and s.age_declared_at is not null
    and s.rules_accepted_at is not null for update;
  if not found then raise exception 'Session unavailable'; end if;
  perform 1 from public.public_chat_rooms r where r.id=p_room_id
    and r.closed_at is null for update;
  if not found then raise exception 'Conversation unavailable'; end if;
  perform 1 from public.public_chat_members m where m.session_id=p_session_id
    and m.room_id=p_room_id and m.left_at is null;
  if not found then raise exception 'Not a member'; end if;
  select coalesce(max(id),0) into v_latest from public.public_chat_messages where room_id=p_room_id;
  if v_latest<>p_expected_latest_id then raise exception 'Context changed'; end if;
  insert into public.public_chat_messages(room_id,sender_session_id,body)
    values(p_room_id,p_session_id,p_body) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.public_chat_begin(text,text) from public,anon,authenticated;
revoke all on function public.public_chat_match(uuid) from public,anon,authenticated;
revoke all on function public.public_chat_leave(uuid,boolean) from public,anon,authenticated;
revoke all on function public.public_chat_state(uuid) from public,anon,authenticated;
revoke all on function public.public_chat_read(uuid,uuid,bigint) from public,anon,authenticated;
revoke all on function public.public_chat_safe_insert_v2(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.public_chat_begin(text,text) to service_role;
grant execute on function public.public_chat_match(uuid) to service_role;
grant execute on function public.public_chat_leave(uuid,boolean) to service_role;
grant execute on function public.public_chat_state(uuid) to service_role;
grant execute on function public.public_chat_read(uuid,uuid,bigint) to service_role;
grant execute on function public.public_chat_safe_insert_v2(uuid,uuid,text,bigint) to service_role;
