## Temporary IP bans for under-18 disclosures (NOT ACTIVE)

The migration `20261115030000_public_chat_ip_bans.sql` adds hashed, expiring IP bans with a default proposed 24-hour duration. The HMAC helper is in `supabase/functions/_shared/ip-ban.ts`.

**Important:** These are storage and hashing foundations, not a working IP ban. No trustworthy client IP is currently wired to the Supabase Edge Function. Never take the IP from the browser, a request JSON field, or an unverified forwarding header: those can be forged. A trusted edge (for example, a controlled Cloudflare Worker with authenticated requests to the backend) must determine the real client IP, check active bans **before issuing any session**, and record a ban when the server confirms a minor disclosure. Do not activate until that trust boundary is implemented and tested.

Hash IPs using a separate server-side 32+ character secret with HMAC-SHA256; do not store raw IPs. Rotate the secret with a documented migration/expiry policy. Provide a way to review/clear mistaken bans and delete expired records. A shared household, school, VPN or mobile carrier may have many users behind one IP, so never assume an IP identifies a particular person. Ban expiry: 24 hours by default, no automatic indefinite punishment. IP-derived hashes remain personal data under GDPR when linkable to people; assess lawful basis, notice and retention.

**Release status:** public chat disabled. No claim of effective IP bans until edge enforcement and end-to-end tests are complete.
