-- Required for signed Cloudflare gateway request replay protection.
-- Apply after the public chat foundation migration; public chat stays disabled.
create table if not exists public.public_chat_gateway_nonces (
 nonce uuid primary key,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists public_chat_gateway_nonces_expiry on public.public_chat_gateway_nonces(expires_at);
alter table public.public_chat_gateway_nonces enable row level security;
revoke all on public.public_chat_gateway_nonces from anon,authenticated;
-- Schedule deletion of expired nonces; do not enable public chat until set up.
