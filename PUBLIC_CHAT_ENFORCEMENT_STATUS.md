# Child-safety enforcement integration — NOT DEPLOYED / NOT LIVE

Implemented in repository:
- `supabase/functions/public-chat/index.ts`: a new **send-only** Edge Function, disabled unless `PUBLIC_CHAT_ENABLED=true`; never set this until release gates pass.
- `supabase/migrations/20261115020000_public_child_safety_enforcement.sql`: atomic service-role-only session revocation, room closure, incident log and protected message insert.
- `supabase/functions/_shared/public-moderation.ts`: server-side screening, including contextual under-18 replies when the most recent message from the other participant asks their age.

## Under-18 response
1. Do not store or deliver the under-18 message.
2. Revoke the visitor's session and close the room atomically.
3. Mark room memberships as left and create an incident record for safeguarding review.
4. Return a generic end-of-conversation message. Do not request ID or personal details.
5. No permanent identity/device ban is possible with the current anonymous design.

## Important outstanding work
- **Not deployed:** SQL must be reviewed/applied manually; Edge Function must be deployed separately. Neither is active.
- **No public session issuance or matchmaking:** the endpoint cannot be used by ordinary visitors; do not bypass this with fabricated age-verified rows.
- **No message read endpoint:** the endpoint implements guarded sends only.
- **No trained human reviewer, alerting, incident queue UI, appeals or safeguarding escalation coverage yet.**
- **No abuse-resistant rate limits** or anti-evasion controls yet.
- **Contextual detection is limited:** the last-other-message lookup and send are not serialized together, so simultaneous messages can change context; this needs a single atomic per-room send transaction before production.
- **False positives and false negatives:** age jokes, typos, obfuscated text, multi-turn grooming and indirect disclosures can evade or confuse rule matching. Human review is essential.
- **Age assurance is not implemented:** self-declaration is not proof of adulthood.
- Do not activate `PUBLIC_CHAT_ENABLED` or claim child safety is guaranteed until security, privacy and safeguarding review, operational moderation, tests and age-safety launch gates are complete.
