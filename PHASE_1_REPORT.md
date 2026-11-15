# Phase 1 — Anonymous public-chat foundation

Status: **source code complete on review branch; not deployed; not production ready.**

## Implemented

1. Public one-to-one chat page with a simple 18+ declaration and rules agreement. The checkbox is a **self-declaration, not independent verification**.
2. One-hour anonymous token sessions generated on the backend, storing only a SHA-256 token hash and a pseudonymous HMAC IP hash. No account or identity document is requested.
3. Database-transaction matchmaking, waiting queue, one active room per participant and a two-member room limit.
4. Polling-based near-real-time message reading (2.5-second interval); message writes retain server-side moderation, with an optimistic context/version check inside a locked database transaction to prevent concurrent writes from skipping age-context moderation.
5. Next Person closes the old room, leaves the partner informed via state and rematches the current visitor; immediate rematching with the last partner is excluded.
6. End Chat closes the room and revokes the visitor session.
7. New runnable Node tests and regression checks for the Phase 1 request flow.

## Files changed

- apps/web/app/chat/page.tsx: new client-side public-chat page.
- supabase/functions/public-chat/index.ts: additional API actions while retaining signed Cloudflare gateway validation and moderation.
- supabase/migrations/20261115050000_public_chat_phase1.sql: new waiting queue and service-role-only SQL functions.
- tests/public-chat/phase1.test.mjs: local mocked end-to-end protocol tests.

## Test evidence

- 10/10 Phase 1 tests passed with Node 22, mocked Supabase SDK, and actual moderation rules.
- Tested: UI TSX syntax; backend TypeScript syntax; SQL static contract; start consent; invalid signatures; disabled API; start → match → state → send → read → leave; stolen token at different IP; unauthorized room reads; minor disclosure enforcement.
- Tests are **not** against a live Postgres database, Cloudflare, Supabase deployment, or two real browsers. No complete Next.js production build was performed in this offline environment.

## Remaining gaps before any public usage

- Apply and review SQL on a staging database and deploy a separate staging Edge Function; do not overwrite the live browser-editor function during development.
- Run real two-browser, concurrency, connection-recovery, access-control and transaction tests.
- Finish Phase 2 safeguarding, reporting, blocking, rate limiting, human oversight, and incident escalation. Automated regex detection is incomplete and subject to evasion.
- Finish legal review on adult age assurance / self-declaration. The migration deliberately stores age_declared_at separately from age_verified_at to avoid misleading verification claims.
- Add data retention / expired queue and session cleanup, better handling of shared networks, refresh/reconnection, and browser-build/operational monitoring.
- Frontend needs NEXT_PUBLIC_PUBLIC_CHAT_GATEWAY_URL to connect. It is deliberately absent by default, so the entry control remains unavailable.

## Running the added tests

With Node.js 22+ and the repository's npm dependencies installed:

~~~bash
node --test tests/public-chat/phase1.test.mjs
~~~

This branch is intended for review and staging, not a launch.
