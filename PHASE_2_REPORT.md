# Phase 2 report — Public-chat safeguarding

**Result:** Phase 2 code is built and locally tested on a draft review branch. It is not deployed, and the public service is not ready for visitors.

## Built

1. **Report:** visitors can report a received message or a conversation, with a controlled reason list. Database functions verify session/room membership and message authorship. Duplicate reports are deduplicated; a short reporting period remains after ordinary departure.
2. **Block:** block-and-leave closes the conversation and prevents the same anonymous sessions matching again in either direction. Matching and blocking use the same transaction lock. The exclusion is not persistent across new anonymous sessions.
3. **Flood limits:** atomic database rate limits on IP and session, including session starts, messages, matchmaking, reporting and blocking. Errors fail closed.
4. **Age-safety rules:** more explicit and contextual minor disclosures, including word-form ages and recent questions. Serious safety enforcement still revokes the session; limited rule-based moderation is not a comprehensive safeguard.
5. **Moderation management:** staff-only report queue, severity-based ordering, audit trail, manual dismiss/revoke/ban decisions, and a local operator CLI. Browser visitors cannot invoke staff functions. A production-grade authenticated moderator dashboard and trained coverage are still missing.
6. **Website:** report message, report conversation, report the previous chat while the session is live, and block-and-leave controls.

## Source changes

- apps/web/app/chat/page.tsx — interface and report/block actions.
- supabase/functions/public-chat/index.ts — signed report/block endpoints and rate checks.
- supabase/functions/_shared/public-moderation.ts — expanded rules.
- supabase/migrations/20261115060000_public_chat_phase2_safety.sql — new tables, RPCs and access restrictions.
- scripts/public-chat-moderation.mjs — operator-only tool.
- tests/public-chat/phase1.test.mjs — mock maintenance; tests/public-chat/phase2.test.mjs — Phase 2 tests.
- SAFETY_OPERATIONS.md — operational draft and review prerequisites.

## Test evidence

A local offline suite of **92 tests passed**: 28 Phase 2 tests, 10 Phase 1 tests, and 54 prior gateway, moderation, IP-ban and SQL-contract tests. The full suite and execution log are provided in the accompanying downloadable bundle. Run with Node.js 22:

~~~bash
node --experimental-strip-types --test tests/public-chat/{phase1,phase2,moderation,gateway,ip-ban,sql-contract,security-regressions}.test.mjs
~~~

The tests use mocked Supabase calls. SQL tests are static checks, **not** execution of the migration against PostgreSQL. No real Supabase RLS verification, concurrency stress test, Cloudflare integration, Next.js production build or multi-browser staging tests have been run. This limitation is substantial.

## Safe integration order

This Phase 2 PR is based on the Phase 1 draft branch; Phase 1 must be integrated first. Review the Phase 1 and Phase 2 migrations in a separate staging database before deploying either function or frontend. GitHub source commits do not update the Supabase browser editor or any Cloudflare environment settings.

The Phase 2 code foundation is complete, but operational moderation, age assurance, legal/privacy review, cleanup and staging security testing must be completed before opening a public service.
