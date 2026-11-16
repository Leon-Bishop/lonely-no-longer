# Phase 6 — operational readiness, monitoring and staged launch

**Status: not operational, not released, not approved.** These documents and scripts are preparation artifacts. Do not use them to infer that anyone is monitoring real traffic.

## What the code provides

- `supabase/migrations/20261115080000_public_chat_monitoring.sql`: read-only aggregate metrics (report queue size, urgent reports, oldest report age, safety incident volume, open rooms, waiting sessions). Security-definer function checks `service_role` and returns no message bodies, tokens or IP hashes.
- `scripts/public-chat-monitor.mjs`: manual staff-environment monitor; reads aggregate metrics from Supabase, exits with a failure status when urgent reports are pending or oldest pending reports exceed 60 minutes. No email, SMS or paging is configured; this is **not an alerting system**.
- `ops/release-approval-template.json` and `scripts/public-chat-release-gate.mjs`: fail-closed, read-only checklist. No fields are approved. Humans must inspect evidence; passing a script alone is never a release authorisation.
- `.github/workflows/public-chat-review.yml`: code review tests and static frontend build; not deployment automation.

## Required people and operating setup

1. Appoint a named data controller, privacy contact, safeguarding lead, trained moderators and a separate on-call incident responder. Write duty coverage and availability.
2. Use least-privilege authenticated staff access. The Phase 2 CLI accepts operator labels and service-role credentials; do **not** treat it as adequate staff authentication or make it browser-accessible.
3. Set a documented urgent-report response target, triage order, escalation channels, emergency/legal advice, incident record handling, an appeal channel, and a false-ban review process.
4. Set up external uptime, error-rate, queue-age and urgent-case notifications to a staffed channel, test delivery/failover, and review operational metrics without exposing messages or IP-derived identifiers.
5. Put service-role keys in a secret manager on a trusted host only. Rotate credentials after any suspected exposure.

## Staging release procedure (proposal)

1. Obtain a separate Cloudflare Worker, Supabase project and deployment URL for staging; keep secrets, hashes and data completely independent.
2. Apply migrations in order on staging with source-controlled, reviewed migration tooling; verify RLS and role restrictions from non-service-role connections.
3. Deploy the gateway and Edge Function to staging, connect a staging frontend, and run automated / manual tests from `STAGING_TEST_PLAN.md`.
4. Require completed adult-age assurance/child-protection assessment and a privacy DPIA, final privacy/terms, secure staff access, funded staff coverage and independent security review.
5. Check rollback procedure: verify the two independent traffic switches, revoke a staging session, restrict new connections, close active rooms, retain legally required incident records, and page staff.
6. Pilot with an agreed small group of invited consenting adults under the staffing rota. Review reports, session concurrency, abuse rates, false positives and accessibility.
7. Hold an explicit human go/no-go meeting with written approvers and evidence for all release gates. If any are unresolved, **do not proceed**.
8. Only after these checks and human sign-off, plan production changes in a separate change window with rollback approval. No GitHub draft PR merge or production flag change is performed by these documents.

## Incident response worksheet

- **Intake:** time detected; what changed; alert source; incident handler; user/safety impact; systems affected. Avoid copying private message bodies into routine tickets.
- **Triage:** determine whether child harm, imminent physical danger, a data leak, availability failure or incorrect moderation is suspected. Preserve relevant restricted evidence only.
- **Contain:** stop new access if moderation is unavailable; isolate gateway/function as appropriate; revoke compromised sessions and rotate credentials. Coordinate with operator before any action affecting users.
- **Escalate:** urgent safeguarding issues go to appointed lead/trained reviewers; emergencies use relevant services. Do not attempt independent criminal investigations or notify unrelated third parties.
- **Data breach:** assess GDPR impact and notification rules. Where required, notify the Irish DPC without undue delay, generally within 72h of awareness, and notify affected people if the high-risk criteria apply. Document decisions even when notification is not required.
- **Recovery:** address root cause, deploy fixes through staging, run regression suite and independent checks, review logs, and confirm assigned on-call coverage.
- **Review:** preserve a restricted incident report, fix playbooks, check false positives, and document preventive changes.

## Data retention and maintenance

- Phase 3 SQL is deliberately not scheduled. Get legal sign-off and test on staged data before scheduling. Exempt all report/incident rooms from ordinary message deletion.
- Cases, sessions, audit actions, backup copies and legal holds need separate deletion/retention policies and implementation.
- Rotate/limit backend secrets, keep GitHub dependencies patched, rerun security/a11y checks after changes and perform periodic review of age-safety risks.

## Required final manual actions

- Independent legal/DPIA, regulatory and child-safety reviews.
- Real Postgres and production-equivalent Cloudflare/Supabase staging integration, RLS and concurrency tests.
- Formal availability/responsibility for human moderation, complaints, emergency and privacy requests.
- Real browser/device and accessibility testing.
- Working alert/paging, incident practice, retention scheduling, controlled adult pilot, change approval and post-launch support.

**This phase only supplies software and documentation to support these activities.**
