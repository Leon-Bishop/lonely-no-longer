# Phase 5 — testing and isolated staging procedure

**Testing status:** offline source/mock tests can run through GitHub Actions. No real Supabase Postgres/RLS, Cloudflare Worker, mobile device or child-safety penetration test has been completed.

## Automated, read-only checks

- `node --experimental-strip-types --test tests/public-chat/*.test.mjs` — regressions, gateway signatures, moderation rules, Phase 1 and Phase 2 mocked backend behaviour, and Phase 3–5 source contracts.
- `node scripts/public-chat-preflight.mjs` — verifies key preview-source fail-safe properties and absence of service-role credentials in the frontend. This cannot verify remote service settings or detect secrets outside the checked files.
- GitHub Actions workflow `.github/workflows/public-chat-review.yml` runs those checks and a fresh Next.js static build for proposed changes.
- Optional safe GET-only staging probe: `STAGING_GATEWAY_URL=https://your-staging-worker.example node tests/public-chat/staging-smoke.mjs`. It deliberately refuses known production domains or names lacking a staging/test marker.

## Required separate staging environment

1. Provision a **different Supabase project** and **different Cloudflare Worker** exclusively for staging. Never reuse live service role credentials, gateway HMAC secret, IP-hash secret or database.
2. Apply and review SQL migrations 01–07 in order on staging only; assert grants/RLS prevent anon/authenticated table access and all privileged functions require service_role.
3. Use fake test-only adult session data. Keep any experimental public endpoint access-restricted. Confirm frontend static output and staging environment URLs.
4. Run two-browser join/match/converse/Next/End tests across Chrome/Firefox/Safari on mobile and desktop. Verify a second person only ever sees their authorised room.
5. Test deliberate race conditions: duplicate start, concurrent match, simultaneous sends, minor reply against the prior message, block vs match, revoke vs send, report while room closes.
6. Test minors/grooming/harassment **with trained child-safety reviewers**; measure evasion and false-positive rates. Don't collect or generate child sexual abuse imagery.
7. Verify reporting queue, staff permissions, escalation procedures, bans/appeals, shared-network effects, failures of database moderation or rate-limit storage, and emergency contacts.
8. Test shortened access tokens, replayed signed requests, stale nonce, bogus gateway signature, oversized payload, cross-origin requests, and denial-of-service patterns.
9. Test expired identifiers, scheduled cleanup in a dry-run environment, preservation of report/incident evidence, lawful deletion, backup retention and abuse monitoring.
10. Complete independent accessibility, GDPR/DPIA, age-safety and security sign-offs.

## Non-negotiable evidence before considering release

- Database migration and RLS audit report, concurrency test log, Cloudflare/Supabase staging logs and zero unresolved critical findings.
- Approved privacy notice/terms, retention and age-assurance basis, staffed safeguarding/moderation plan, accessible complaint channel and data subject rights procedure.
- Tested rollback, emergency stop and documented responsible operators.

**Never treat a green unit test or a mocked end-to-end simulation as evidence that these live conditions are satisfied.**
