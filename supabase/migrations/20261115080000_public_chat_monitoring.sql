-- Phase 6: aggregate, service-role-only monitoring. No message bodies, tokens or IPs.
-- Use in a separate staging project first. This is NOT an alerting service.
create or replace function public.public_chat_operational_metrics()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_reports bigint; v_urgent bigint; v_oldest integer;
        v_incidents bigint; v_rooms bigint; v_waiting bigint;
begin
 if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
 select count(*)::bigint,
        count(*) filter (where reason in ('underage','grooming','threat'))::bigint,
        coalesce(max(extract(epoch from (now()-created_at)))::integer,0)
 into v_reports,v_urgent,v_oldest
 from public.public_chat_reports where status='pending';
 select count(*)::bigint into v_incidents from public.public_chat_safety_incidents
 where created_at >= now()-interval '1 hour';
 select count(*)::bigint into v_rooms from public.public_chat_rooms
 where closed_at is null;
 select count(*)::bigint into v_waiting from public.public_chat_waiting;
 return jsonb_build_object(
  'captured_at',now(),
  'pending_reports',v_reports,
  'urgent_pending_reports',v_urgent,
  'oldest_pending_age_seconds',v_oldest,
  'safety_incidents_last_hour',v_incidents,
  'open_rooms',v_rooms,
  'waiting_sessions',v_waiting);
end $$;
revoke all on function public.public_chat_operational_metrics() from public,anon,authenticated;
grant execute on function public.public_chat_operational_metrics() to service_role;
