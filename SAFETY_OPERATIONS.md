# Lonely No Longer — Phase 2 safety operations (draft)

**Status:** code review and offline tests only. This document does not mean trained moderators, legal approval or child protection operations are in place.

## Visitor safeguards

- Visitors may report an individual received message or an entire conversation. A report is an **allegation**, not proof, and does not automatically punish anyone.
- Blocks only exclude the two current anonymous sessions; a fresh session cannot reliably be linked to a previously blocked person.
- A block also closes the current room to prevent further message delivery.
- Simple moderation rules detect some age disclosures, grooming attempts, contact requests and threats. They can be bypassed and may falsely flag messages.
- Existing critical-safety enforcement can revoke a session, close a room and impose an expiring gateway-hashed-IP cooldown; shared networks can be affected unfairly.
- Rate-limit counters are atomic and stored in PostgreSQL. They reject floods after they reach the gateway and backend; Cloudflare edge rate limiting and wider bot protection remain unfinished.

## Staff review process — not yet operational

1. Appoint trained moderators, a safeguarding lead and an incident duty rota. Define response times for urgent and ordinary reports before admitting visitors.
2. Access moderation data through a dedicated **staff-only environment**, never the public chat page. Staff identity and authentication must be independently enforced; a typed reviewer label is not verified identity.
3. Prioritise reports about minors, grooming, threats or immediate danger. Review relevant evidence and context; do not act solely on the existence of an allegation.
4. Manually choose dismiss, revoke session, or revoke session plus expiring hashed-IP ban. The SQL review transaction records an audit action and closes any active conversation where necessary.
5. Escalate credible child-safety or emergency incidents through an expert-reviewed procedure to appropriate safeguarding or emergency services when needed. Avoid sharing message excerpts with unrelated people.
6. Record and review accidental bans, shared-network impacts, appeals and legitimate requests to correct records.
7. Monitor the queue, protect the service-role credentials and pause new visitor access if moderation or reporting is unavailable.

## Trusted operator CLI

A command-line tool is provided for the secure staff environment. It is **not** a public moderator dashboard or replacement for authenticated staff accounts. Do not put any service-role key in the website, build variables, screenshots or shared logs.

Locally configure the two environment variables SUPABASE_URL (HTTPS project base URL) and SUPABASE_SERVICE_ROLE_KEY (server-side service-role credential) from a trusted secret store. With Node.js 22+ and an applied staging migration:

~~~bash
node scripts/public-chat-moderation.mjs queue 25
node scripts/public-chat-moderation.mjs review 123 dismiss staff_01 --confirm
node scripts/public-chat-moderation.mjs review 123 revoke staff_01 --confirm
node scripts/public-chat-moderation.mjs review 123 revoke_ban staff_01 --confirm
~~~

The tool validates arguments and requires explicit --confirm for every review. Operator labels such as staff_01 must be mapped to authenticated individuals by a separate secure operational system. Queue results can contain message excerpts; protect terminal histories and logs.

## Fixed-window limits, subject to staging review

| Scope | Maximum requests | Window |
|---|---:|---|
| All signed requests per hashed IP | 180 | 1 minute |
| New sessions per hashed IP | 6 | 10 minutes |
| Sends per anonymous session | 25 | 1 minute |
| Match / Leave per session | 12 each | 1 minute |
| State / Messages per session | 40 each | 1 minute |
| Reports per session | 5 | 10 minutes |
| Blocks per session | 10 | 10 minutes |

The backend fails closed when the rate-limit database cannot be reached.

## Unresolved before launch

- Review every schema migration and staff RPC under real Supabase PostgreSQL/RLS roles, concurrency and transaction tests.
- Independently authenticated and least-privilege moderator accounts, real staffing, emergency and appeal procedures.
- Appropriate age assurance (visitor self-declaration is not independent age verification), child-safety expert review and independent evasion tests.
- GDPR analysis of pseudonymous identifiers, retention, deletion, evidence preservation and legal basis.
- Scheduled cleanup of nonce, rate-limit, session, ban, queue and message records, plus production monitoring and alerts.
- Cloudflare-level flood defences, real browser/edge tests and staged deployments.

The private invite-only chat is outside this phase.
