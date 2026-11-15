-- Safeguarding enforcement. Run after 20261115010000_public_chat_foundation.sql.
-- No public access; only service-role API may invoke these functions.
create table if not exists public.public_chat_safety_incidents (
 id bigint generated always as identity primary key,
 session_id uuid not null references public.public_chat_sessions(id),
 room_id uuid references public.public_chat_rooms(id),
 reason text not null check (reason in ('minor_disclosure','critical_safety')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table public.public_chat_safety_incidents enable row level security;
revoke all on public.public_chat_safety_incidents from anon,authenticated;
revoke all on sequence public.public_chat_safety_incidents_id_seq from anon,authenticated;

create or replace function public.public_chat_revoke_for_safety(
 p_session_id uuid, p_room_id uuid, p_reason text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_room uuid;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if p_reason not in ('minor_disclosure','critical_safety') then raise exception 'Invalid reason'; end if;
 -- Serialize with all sends and membership changes for this session.
 perform 1 from public.public_chat_sessions where id=p_session_id for update;
 if not found then return false; end if;
 select m.room_id into v_room from public.public_chat_members m
 where m.session_id=p_session_id and m.room_id=p_room_id and m.left_at is null for update;
 if v_room is null then return false; end if;
 update public.public_chat_sessions set revoked_at=coalesce(revoked_at,now()) where id=p_session_id;
 update public.public_chat_rooms set closed_at=coalesce(closed_at,now()) where id=p_room_id;
 update public.public_chat_members set left_at=coalesce(left_at,now()) where room_id=p_room_id;
 insert into public.public_chat_safety_incidents(session_id,room_id,reason) values(p_session_id,p_room_id,p_reason);
 return true;
end $$;
revoke all on function public.public_chat_revoke_for_safety(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.public_chat_revoke_for_safety(uuid,uuid,text) to service_role;

-- An atomic send ensures a revoked participant or closed room cannot send,
-- even if their request raced with the safeguarding revocation.
create or replace function public.public_chat_safe_insert(
 p_session_id uuid,p_room_id uuid,p_body text
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if char_length(p_body) not between 1 and 500 then raise exception 'Invalid length'; end if;
 perform 1 from public.public_chat_sessions s where s.id=p_session_id
 and s.revoked_at is null and s.expires_at>now() and s.age_verified_at is not null for update;
 if not found then raise exception 'Session unavailable'; end if;
 perform 1 from public.public_chat_rooms r where r.id=p_room_id and r.closed_at is null for update;
 if not found then raise exception 'Room closed'; end if;
 perform 1 from public.public_chat_members m where m.session_id=p_session_id
 and m.room_id=p_room_id and m.left_at is null;
 if not found then raise exception 'Not a member'; end if;
 insert into public.public_chat_messages(room_id,sender_session_id,body)
 values(p_room_id,p_session_id,p_body) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.public_chat_safe_insert(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.public_chat_safe_insert(uuid,uuid,text) to service_role;
