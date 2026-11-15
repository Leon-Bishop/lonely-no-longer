# Cloudflare gateway and child-safety IP bans — DEPLOYMENT BLOCKED

## Implemented in GitHub
- `cloudflare/public-chat-gateway/worker.js`: obtains `CF-Connecting-IP` from Cloudflare's trusted edge, HMAC-hashes it and signs the request body, hash, timestamp and nonce. **Do not accept a browser-provided IP.**
- `supabase/functions/public-chat/index.ts`: checks gateway signature, timestamp, one-time nonce, active IP ban, server-side message moderation, session and room membership. A minor disclosure revokes the session, closes the room and creates a 24-hour hashed-IP ban.
- `supabase/migrations/20261115030000_public_chat_ip_bans.sql`: stores expiring bans.
- `supabase/migrations/20261115040000_public_chat_gateway_nonces.sql`: stores used request nonces to reject replay.

## Not deployed
These are source changes only. Neither Cloudflare Worker nor Supabase function is deployed or routed. SQL has not been run. The homepage is still preview-only. `PUBLIC_CHAT_ENABLED` MUST remain unset/false at both gateways.

## Configuration for a future controlled staging deployment
- Cloudflare Worker secret: `PUBLIC_CHAT_GATEWAY_SECRET` (random >=32 characters).
- Supabase Edge Function secret: same `PUBLIC_CHAT_GATEWAY_SECRET`.
- Cloudflare Worker secret: `PUBLIC_CHAT_IP_HASH_SECRET` (different random >=32 characters).
- Cloudflare Worker variables: `PUBLIC_CHAT_ORIGIN` (exact website origin), `PUBLIC_CHAT_BACKEND_URL` (exact Supabase function URL), `PUBLIC_CHAT_ENABLED=false`.
- Supabase Edge Function variables: `PUBLIC_CHAT_ORIGIN`, `PUBLIC_CHAT_ENABLED=false`.
- Never expose these secrets via NEXT_PUBLIC variables or GitHub.

## Critical blockers before launch
1. Implement age-safety compliance and legitimate age-verified anonymous session issuance; **do not fabricate verified sessions**.
2. Add secure matchmaking, message retrieval, and real-time session/ban checks on every API action, including entry and rematching. Only send is currently implemented.
3. Add rate limiting at Cloudflare and Supabase, reliable human moderation and incident escalation, user reports, appeal and mistaken-IP-ban review.
4. Ensure all message writes and age-context reads are serialized in a single database transaction; concurrent messages can currently evade contextual checks.
5. Validate IPv4/IPv6 canonicalization and forwarded-IP trust, test Cloudflare's actual header semantics, prevent direct backend bypass, and perform end-to-end tests.
6. Schedule deletion of expired nonce rows and bans; document GDPR lawful basis, transparency, retention, and access controls. Hashed IPs can still be personal data.
7. Review false positives: shared Wi-Fi, mobile carrier NAT, schools and families can share IPs; 24-hour bans must be reviewable.
8. Add deployment automation and security monitoring. Do not claim protection is operational until independently tested.

## Explicit launch status
**OFF.** A code implementation is not a deployed, verified protection system. No public matchmaking is enabled.
