# Phase 3 — privacy, data retention and legal review register (DRAFT)

**Status: preparation only, not legal approval, not a final public privacy notice.**
The project has a static visitor preview and planned anonymous adult chat, with a deployed but disabled safety gateway. Phase 1 and Phase 2 proposals are draft PRs, not production. A browser-only self-declaration must never be presented as verified age.

## Processing inventory for counsel / operator

| Data | Why it is proposed | Planned handling | Pending decision |
|---|---|---|---|
| 64-character raw visitor token | authenticate anonymous chat | browser memory only; SHA-256 token hash in Supabase | stolen-device/session policy |
| age declaration and rule acceptance timestamps | enforce entry step | session record | age-assurance adequacy and compliance |
| hashed IP (keyed HMAC from trusted gateway) | limit abuse and issue expiring bans | pseudonymous; not truly anonymous | lawful basis, NAT false positives, appeal |
| chat messages and room history | delivery and basic safety context | server stores plaintext for pre-delivery moderation | lawful basis, retention, special-category/unexpected sensitive data |
| reports and moderation decisions | safeguard visitors and review allegations | restricted service-role tables | evidence access, limited retention, appeal, allegations accuracy |
| safety incidents and hashed IP bans | safety investigations | restricted records | legal hold/retention, escalation, independent oversight |
| host/CDN network logs | delivery and protection | Cloudflare and Supabase provider systems | log retention, transfer safeguards, subprocessor inventory |

## DPC/GDPR tasks before launch

1. Identify the actual legal **data controller** and publish an independently reachable privacy contact method. Do not invent an address or email.
2. Map each processing purpose to an Article 6 lawful basis; assess any Article 9/10 issues that arise from user-provided content. No basis is assumed by code.
3. Carry out and document DPIA screening and likely a full DPIA for anonymous chat, safety inference, safeguards, false-positive bans and vulnerable people. Have an appropriate specialist review risks.
4. Confirm subprocessor agreements and actual data regions, access, transfers, retention/backup purge schedules for Supabase and Cloudflare.
5. Approve a retention schedule for ordinary content, pending reports, closed investigations, ban hashes, audit actions, backups and regulator/law-enforcement holds. The cleanup SQL in this phase is **opt-in**, deletes only expired ephemeral records / ordinary closed-room messages, and never automatically deletes rooms with reports or incidents.
6. Implement an audited data-subject-rights workflow without pretending an anonymous visitor can always be reidentified. Provide an accessible request channel once operational.
7. Complete mandatory transparency information: identity/contact, lawful basis, recipients, transfer safeguards, retention, rights, complaint channels, security limitations, and any relevant automated decisions.
8. Assess the application of the EU Digital Services Act to this specific user-to-user chat model: classifications of intermediary/hosting/online platform differ. A one-to-one messaging service is not automatically a video-sharing platform. Determine what notice/action/appeal duties, if any, apply.
9. Confirm whether Ireland's Online Safety and Media Regulation Act and the specific Online Safety Code apply; the currently published Code addresses designated video-sharing platforms, not every private text-chat product.
10. Commission legal/child-safety advice about the adequacy of **self-declaration** for adults-only access, taking account of service risk. No claim that checking a box prevents child access.
11. Document personal-data breach response, DPC notification assessments (generally within 72h where notification is required), and communications.
12. Obtain written approval of final Privacy Notice, Terms, Community Rules, operator contact and incident procedures **before** replacing the preview text.

## Retention design (not in effect)

- Draft: closed rooms without safety reports/incidents may have messages deleted after **24 hours**; tune only after approval.
- Nonces: remove one hour after expiration; counters after 24 hours; expired bans after another 24 hours.
- Cases / reports / safeguarded rooms: **deliberately excluded** from automatic deletion until review and legal holds are defined.
- Sessions, reports and backups still require an approved and implemented purge workflow. Do not label retention complete merely because one SQL function exists.
- The utility must run **only** in a reviewed, access-controlled environment, with service-role privileges. Do not schedule it without a dry-run and approval.

## Authoritative reference links (accessed Nov 15, 2026)

- DPC privacy notices: https://dataprotection.ie/en/faqs/responsibilities-data-controllers/how-do-i-make-privacy-policy
- DPC transparency: https://www.dataprotection.ie/en/organisations/know-your-obligations/transparency
- DPC retention: https://dataprotection.ie/en/faqs/responsibilities-data-controllers/how-long-should-personal-data-be-held-meet-obligations-imposed-gdpr
- DPC DPIA: https://www.dataprotection.ie/en/organisations/know-your-obligations/data-protection-impact-assessments
- DPC breach notification: https://www.dataprotection.ie/en/organisations/know-your-obligations/breach-notification
- DSA (EUR-Lex): https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng
- Coimisiún na Meán: https://www.cnam.ie/general-public/online-safety/online-safety-framework/legislation-explained/
