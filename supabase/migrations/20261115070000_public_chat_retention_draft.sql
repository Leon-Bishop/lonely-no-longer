-- Phase 3: service-role-only, opt-in retention utilities for staging review.
-- This migration DOES NOT schedule deletions or establish an approved retention policy.
-- Review retention/legal holds, backups and sequencing before calling it operational.
create or replace function public.public_chat_prune_ephemeral(
 p_message_hours integer default 24
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_nonces bigint:=0; v_limits bigint:=0; v_bans bigint:=0;
        v_waiting bigint:=0; v_messages bigint:=0;
begin
 if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
 if p_message_hours < 24 or p_message_hours > 720
 then raise exception 'Invalid retention period'; end if;
 -- Serialize with queue/match/leave transitions before queue cleanup.
 perform pg_advisory_xact_lock(7647218349);
 delete from public.public_chat_gateway_nonces where expires_at < now()-interval '1 hour';
 get diagnostics v_nonces = row_count;
 delete from public.public_chat_rate_limits where window_start < now()-interval '24 hours';
 get diagnostics v_limits = row_count;
 delete from public.public_chat_ip_bans where expires_at < now()-interval '24 hours';
 get diagnostics v_bans = row_count;
 delete from public.public_chat_waiting w where not exists (
   select 1 from public.public_chat_sessions s where s.id=w.session_id
     and s.revoked_at is null and s.expires_at>now()
 );
 get diagnostics v_waiting = row_count;
 -- Only ordinary closed rooms. ALL rooms with reports or safeguarding incidents
 -- are excluded, preserving evidence pending legal retention / review decisions.
 delete from public.public_chat_messages msg
 using public.public_chat_rooms r
 where msg.room_id=r.id
   and r.closed_at < now() - make_interval(hours=>p_message_hours)
   and not exists(select 1 from public.public_chat_reports rep where rep.room_id=r.id)
   and not exists(select 1 from public.public_chat_safety_incidents inc where inc.room_id=r.id);
 get diagnostics v_messages = row_count;
 return jsonb_build_object(
   'nonces',v_nonces,'rate_limits',v_limits,'expired_bans',v_bans,
   'stale_waiting',v_waiting,'ordinary_messages',v_messages
 );
end $$;
revoke all on function public.public_chat_prune_ephemeral(integer) from public,anon,authenticated;
grant execute on function public.public_chat_prune_ephemeral(integer) to service_role;
