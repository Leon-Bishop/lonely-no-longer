-- IP-based child-safety cooldowns; not active until integrated with a trusted edge.
-- Requires public chat foundation migration first.
create table if not exists public.public_chat_ip_bans (
 ip_hash text primary key check(length(ip_hash)=64),
 reason text not null check(reason in ('minor_disclosure','safeguarding')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 last_incident_at timestamptz not null default now(),
 check(expires_at>created_at)
);
create index if not exists public_chat_ip_bans_expiry_idx on public.public_chat_ip_bans(expires_at);
alter table public.public_chat_ip_bans enable row level security;
revoke all on public.public_chat_ip_bans from anon,authenticated;
-- Service-role-only. A trusted edge must derive a canonical client IP;
-- never accept an IP supplied in JSON or an untrusted forwarding header.
create or replace function public.public_chat_set_ip_ban(
 p_ip_hash text,p_reason text,p_hours integer default 24
) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
 if p_ip_hash !~ '^[a-f0-9]{64}$' or p_reason not in ('minor_disclosure','safeguarding')
    or p_hours<1 or p_hours>168 then raise exception 'Invalid ban'; end if;
 insert into public.public_chat_ip_bans(ip_hash,reason,expires_at)
 values(p_ip_hash,p_reason,now()+make_interval(hours=>p_hours))
 on conflict(ip_hash) do update
 set reason=excluded.reason,
     expires_at=greatest(public.public_chat_ip_bans.expires_at,excluded.expires_at),
     last_incident_at=now();
end $$;
revoke all on function public.public_chat_set_ip_ban(text,text,integer) from public,anon,authenticated;
grant execute on function public.public_chat_set_ip_ban(text,text,integer) to service_role;
