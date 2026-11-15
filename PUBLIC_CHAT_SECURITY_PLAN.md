# Public anonymous chat — security foundation (NOT LIVE)

Status: design and implementation checklist only. The private two-invitation prototype is unchanged. Do not connect a public route to it.

## Product rules
- No visitor accounts, passwords, email addresses, profiles, or user-chosen public identifiers.
- Each visitor receives a cryptographically random, short-lived, server-validated session **only after** independent 18+ verification succeeds.
- Verify age through a reputable provider's server-to-server signed result or verified webhook; never trust a browser boolean or a client-submitted "verified" claim.
- Do not store ID images, face scans, dates of birth or provider raw payloads in the chat database. Document provider processing separately.
- One active anonymous chat per session; nickname is playful and non-identifying.
- Only two matched, active, age-verified sessions may read/write a conversation.
- The existing private-chat API is **not** the public API.

## Server security requirements
1. **Age gate:** short-lived, one-time challenge nonce; server verifies provider signature, audience, expiry, result, nonce and replay protection. Fail closed when provider unavailable.
2. **Sessions:** generate 256-bit random opaque session credentials, store only hashed tokens, use secure HttpOnly SameSite cookies where possible, short idle and absolute expiry, rotate on verification, revoke on exit or moderation.
3. **Matchmaking:** atomic queue claim and conversation membership in a database transaction, prevent duplicate matches and races. Never accept a client-provided partner or conversation ID as authorization.
4. **Authorization:** each send/read/report/skip endpoint checks the active server-side session and conversation membership; messages never leak across conversations. Database RLS and least-privilege roles; service role stays server-only.
5. **Rate limits:** enforce server-side limits per session and abuse-resistant network signals for age checks, queueing, sends, reads and reports; protect against distributed abuse. Bound body size, message length, queue size and pagination.
6. **Moderation:** report queue with trained human review, incident escalation, enforceable suspensions, automated abuse signals, emergency policy and documented appeals. Blocking must prevent rematching where feasible, not merely hide a local screen.
7. **Privacy:** choose a short default retention period, enforce deletion jobs and backups policy; encrypt in transit/at rest; avoid message bodies and tokens in logs; publish GDPR privacy notice, lawful bases, DPIA assessment and data processor agreements.
8. **Resilience:** CSRF protections for cookie-backed mutations, strict CORS (not authentication), security headers, monitoring, backup/restore tests, secret rotation and incident-response plan.
9. **Safety:** clearly communicate adult-only status, no sharing contact details, crisis resources, and limitations of moderation. Text-only initially, no uploads or links.

## Release gates (all required)
- [ ] Independent age-assurance vendor selected and legally/privacy reviewed
- [ ] Server-side age result verified, with replay and bypass tests
- [ ] New anonymous session, pairing and isolated conversation APIs built and penetration-tested
- [ ] Abuse rate limiting, bot protection and server-enforced block/report/suspension tested
- [ ] Human moderation coverage and escalation procedures operating
- [ ] Retention/deletion, GDPR documentation and security incident processes approved
- [ ] End-to-end tests: unauthorized access, cross-room reads, race conditions, session theft, spam, expiry and deletion
- [ ] Public launch explicitly approved; public chat remains disabled until then

## Next implementation step
Select an age-assurance provider and document its verified server-to-server integration. Then create a separate public-chat schema and API behind a disabled feature flag. Do not reuse invitation codes as age assurance.
