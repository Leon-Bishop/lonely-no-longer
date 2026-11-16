-- Phase 2 safety controls. Apply only after the Phase 1 migration in an isolated
-- staging database. All write/read RPCs in this migration require service_role.
-- Anonymous reports are allegations for human review, NOT confirmed incidents.

-- Atomic rate limits. Hashed IP/session keys are personal-data-derived identifiers.
-- Time buckets are fixed by this function, not chosen by the browser.
create table if not exists public.public_chat_rate_limits (
  rate_key text not null check(rate_key ~ '^[a-f0-9]{64}$'),
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null check(hits>=1),
  primary key(rate_key,bucket,window_start)
);
create index if not exists public_chat_rate_limits_cleanup on public.public_chat_rate_limits(window_start);
alter table public.public_chat_rate_limits enable row level security;
revoke all on public.public_chat_rate_limits from public,anon,authenticated;

create or replace function public.public_chat_consume_rate_limit(p_rate_key text,p_bucket text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_limit integer; v_period integer; v_start timestamptz; v_hits integer;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_rate_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid key'; end if;
  case p_bucket
    when 'ip_all' then v_limit:=180; v_period:=60;
    when 'start_ip' then v_limit:=6; v_period:=600;
    when 'send_session' then v_limit:=25; v_period:=60;
    when 'match_session' then v_limit:=12; v_period:=60;
    when 'state_session' then v_limit:=40; v_period:=60;
    when 'messages_session' then v_limit:=40; v_period:=60;
    when 'leave_session' then v_limit:=12; v_period:=60;
    when 'report_session' then v_limit:=5; v_period:=600;
    when 'block_session' then v_limit:=10; v_period:=600;
    else raise exception 'Invalid rate-limit bucket';
  end case;
  v_start:=to_timestamp(floor(extract(epoch from clock_timestamp())/v_period)*v_period);
  insert into public.public_chat_rate_limits(rate_key,bucket,window_start,hits)
  values(p_rate_key,p_bucket,v_start,1)
  on conflict (rate_key,bucket,window_start)
  do update set hits=public.public_chat_rate_limits.hits+1
  where public.public_chat_rate_limits.hits < v_limit
  returning hits into v_hits;
  return v_hits is not null;
end $$;

-- Blocks last only as long as the two anonymous sessions exist. A new browser
-- session cannot be linked to previous sessions safely without persistent identity.
create table if not exists public.public_chat_blocks (
  blocker_session_id uuid not null references public.public_chat_sessions(id) on delete cascade,
  blocked_session_id uuid not null references public.public_chat_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_session_id,blocked_session_id),
  check(blocker_session_id<>blocked_session_id)
);
create index if not exists public_chat_blocks_target on public.public_chat_blocks(blocked_session_id);
alter table public.public_chat_blocks enable row level security;
revoke all on public.public_chat_blocks from public,anon,authenticated;

-- Serialize block + match on the same advisory transaction lock, then close
-- the current conversation so the blocked participant loses read/write access.
create or replace function public.public_chat_block(p_session_id uuid,p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_peer uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  perform pg_advisory_xact_lock(7647218349);
  perform 1 from public.public_chat_sessions s where s.id=p_session_id
    and s.revoked_at is null and s.expires_at>now() and s.age_declared_at is not null
    for update;
  if not found then return false; end if;
  if not exists(select 1 from public.public_chat_members m
    join public.public_chat_rooms r on r.id=m.room_id
    where m.room_id=p_room_id and m.session_id=p_session_id
      and m.left_at is null and r.closed_at is null)
  then return false; end if;
  select m.session_id into v_peer from public.public_chat_members m
    where m.room_id=p_room_id and m.session_id<>p_session_id limit 1;
  if v_peer is null then return false; end if;
  insert into public.public_chat_blocks(blocker_session_id,blocked_session_id)
    values(p_session_id,v_peer) on conflict do nothing;
  if not public.public_chat_leave(p_session_id,false) then raise exception 'Unable to close chat'; end if;
  return true;
end $$;

-- Prevent matching both directions of a block, including future rematches.
-- Retain the Phase 1 one-room-per-session and different-hashed-IP safeguards.
create or replace function public.public_chat_match(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.public_chat_sessions%rowtype;
        v_peer uuid; v_room uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
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
    and not exists (select 1 from public.public_chat_blocks b where
       (b.blocker_session_id=p_session_id and b.blocked_session_id=s.id)
       or (b.blocker_session_id=s.id and b.blocked_session_id=p_session_id))
    and not exists (
      select 1 from public.public_chat_members m
      join public.public_chat_rooms r on r.id=m.room_id
      where m.session_id=s.id and m.left_at is null and r.closed_at is null)
  order by w.enqueued_at
  limit 1 for update of w,s skip locked;
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

-- One report per reporter, room and message (null message ID means report chat).
-- The reported message must actually be in this room and sent by the other
-- visitor. A short grace period permits reporting after an ordinary exit.
create unique index if not exists public_chat_report_once
  on public.public_chat_reports(reporter_session_id,room_id,coalesce(message_id,0));
create index if not exists public_chat_reports_queue
  on public.public_chat_reports(status,created_at,id);
create or replace function public.public_chat_report(
 p_session_id uuid,p_room_id uuid,p_message_id bigint,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_peer uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_reason not in ('underage','grooming','harassment','threat','sexual_content','personal_info','spam','other')
  then raise exception 'Invalid report reason'; end if;
  if p_message_id is not null and p_message_id<=0 then raise exception 'Invalid message'; end if;
  if not exists(select 1 from public.public_chat_sessions s
    join public.public_chat_members m on m.session_id=s.id
    where s.id=p_session_id and s.revoked_at is null and s.expires_at>now()
      and s.age_declared_at is not null and m.room_id=p_room_id
      and (m.left_at is null or m.left_at>now()-interval '30 minutes'))
  then return false; end if;
  select m.session_id into v_peer from public.public_chat_members m
    where m.room_id=p_room_id and m.session_id<>p_session_id limit 1;
  if v_peer is null then return false; end if;
  if p_message_id is not null and not exists (
    select 1 from public.public_chat_messages msg
    where msg.id=p_message_id and msg.room_id=p_room_id
      and msg.sender_session_id=v_peer)
  then return false; end if;
  insert into public.public_chat_reports(room_id,message_id,reporter_session_id,reason)
    values(p_room_id,p_message_id,p_session_id,p_reason)
    on conflict do nothing;
  return true;
end $$;

-- Staff-only audit trail and review queue. Do not expose these RPCs through
-- the browser/public-chat action router. Human review is an operational need.
create table if not exists public.public_chat_moderation_actions (
  id bigint generated always as identity primary key,
  report_id bigint not null unique references public.public_chat_reports(id),
  target_session_id uuid references public.public_chat_sessions(id),
  reviewer_ref text not null check(reviewer_ref ~ '^[a-zA-Z0-9_-]{3,64}$'),
  action text not null check(action in ('dismiss','revoke','revoke_ban')),
  created_at timestamptz not null default now()
);
alter table public.public_chat_moderation_actions enable row level security;
revoke all on public.public_chat_moderation_actions from public,anon,authenticated;
revoke all on sequence public.public_chat_moderation_actions_id_seq from public,anon,authenticated;

create or replace function public.public_chat_moderation_queue(p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_limit<1 or p_limit>50 then raise exception 'Invalid limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'report_id', q.id,'reason',q.reason,'created_at',q.created_at,
    'room_id',q.room_id,'message_id',q.message_id,
    'message_excerpt',q.message_excerpt) order by q.priority,q.created_at,q.id),'[]'::jsonb)
  into v_result from (
    select r.id,r.reason,r.created_at,r.room_id,r.message_id,
      left(m.body,240) as message_excerpt,
      case when r.reason in ('underage','grooming','threat') then 0 else 1 end as priority
    from public.public_chat_reports r
    left join public.public_chat_messages m on m.id=r.message_id
    where r.status='pending'
    order by priority,r.created_at,r.id limit p_limit
  ) q;
  return v_result;
end $$;

-- No action is taken merely because someone reports another visitor: an
-- authorized moderator must independently review the reported content first.
create or replace function public.public_chat_review_report(
 p_report_id bigint,p_action text,p_reviewer_ref text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_report public.public_chat_reports%rowtype;
        v_target uuid; v_ip_hash text;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_action not in ('dismiss','revoke','revoke_ban')
     or p_reviewer_ref !~ '^[a-zA-Z0-9_-]{3,64}$'
  then raise exception 'Invalid review'; end if;
  select * into v_report from public.public_chat_reports
    where id=p_report_id and status in ('pending','reviewing') for update;
  if not found then return false; end if;
  if v_report.message_id is not null then
    select m.sender_session_id into v_target from public.public_chat_messages m
      where m.id=v_report.message_id and m.room_id=v_report.room_id;
  else
    select m.session_id into v_target from public.public_chat_members m
      where m.room_id=v_report.room_id and m.session_id<>v_report.reporter_session_id
      limit 1;
  end if;
  if v_target is null and p_action<>'dismiss' then raise exception 'Subject not found'; end if;
  if v_target=v_report.reporter_session_id then raise exception 'Invalid subject'; end if;
  if p_action in ('revoke','revoke_ban') then
    select ip_hash into v_ip_hash from public.public_chat_sessions where id=v_target;
    if not public.public_chat_leave(v_target,true) then raise exception 'Subject unavailable'; end if;
    insert into public.public_chat_safety_incidents(session_id,room_id,reason)
      values(v_target,v_report.room_id,'critical_safety');
    if p_action='revoke_ban' then
      if v_ip_hash is null then raise exception 'Ban key unavailable'; end if;
      perform public.public_chat_set_ip_ban(v_ip_hash,'safeguarding',24);
    end if;
  end if;
  insert into public.public_chat_moderation_actions(report_id,target_session_id,reviewer_ref,action)
    values(p_report_id,v_target,p_reviewer_ref,p_action);
  update public.public_chat_reports set status='resolved' where id=p_report_id;
  return true;
end $$;

revoke all on function public.public_chat_consume_rate_limit(text,text) from public,anon,authenticated;
revoke all on function public.public_chat_block(uuid,uuid) from public,anon,authenticated;
revoke all on function public.public_chat_report(uuid,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.public_chat_moderation_queue(integer) from public,anon,authenticated;
revoke all on function public.public_chat_review_report(bigint,text,text) from public,anon,authenticated;
-- Match was already restricted in Phase 1; repeat privileges for clarity.
revoke all on function public.public_chat_match(uuid) from public,anon,authenticated;
grant execute on function public.public_chat_consume_rate_limit(text,text) to service_role;
grant execute on function public.public_chat_block(uuid,uuid) to service_role;
grant execute on function public.public_chat_report(uuid,uuid,bigint,text) to service_role;
grant execute on function public.public_chat_moderation_queue(integer) to service_role;
grant execute on function public.public_chat_review_report(bigint,text,text) to service_role;
grant execute on function public.public_chat_match(uuid) to service_role;
