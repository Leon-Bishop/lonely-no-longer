# Child-safety moderation — implementation status (NOT LIVE)

This repository contains a **first-pass server-side text classifier** at `supabase/functions/_shared/public-moderation.ts`, plus Deno tests. It is not connected to a public messaging endpoint because public matching is disabled. It does not scan the private two-invitation test chat.

## Non-negotiable integration requirements
- Invoke `moderatePublicMessage` **server-side before database insert or message delivery**. Never rely on browser-side filtering.
- Reject `block` results. Reject and securely queue `escalate` results for trained human review. Do not expose matched rule IDs or details to other chat participants.
- On a credible indication a participant is under 18, **immediately end their adult-only chat session, revoke its token and prevent further matching**; do not ask the child for identifying information.
- Add a server-side report endpoint, moderator-only queue, review audit trail, suspension mechanism, and escalation procedures. The existing reports table alone is not an operational moderation service.
- Apply per-session and abuse-resistant network rate limits; protect against repeated probing, evasion and ban circumvention.
- Keep message retention short; restrict access to reports, protect evidence when legally required, and never put message contents into general application logs.
- Train moderators on child safeguarding and grooming patterns, threats, sexual exploitation, self-harm and emergency escalation. Document incident-response contacts and relevant reporting obligations for Ireland.
- Explicitly prohibit sexual content and sharing contact details. Never claim that all chats are monitored or safe unless staffing and controls actually support that claim.
- Publish clear privacy information explaining automated screening and limited human review, including lawful basis, retention and rights under GDPR.

## Limitations
Pattern matching misses euphemisms, coded language, misspellings, images, context and multi-message grooming. It can also flag innocent statements. It cannot verify age, establish user identity, distinguish a truthful minor disclosure from a joke, or replace trained human moderation. Do not rely on it as the sole protection for children.

## Release status
**Public chat remains OFF.** Before launch: integrate these rules with authenticated session and conversation endpoints, add human review, age-safety assessment, tests for bypass and multi-turn abuse, privacy safeguards, and operational coverage. No vendor or paid service has been enabled.
