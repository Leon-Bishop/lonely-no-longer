# Private two-person chat (free test only)

This is a **separate, invitation-only test**, not a production chat system. It uses a Supabase Edge Function and Cloudflare Pages. Both invitees must be known adults. Invitation codes are not independent age assurance.

## 1. Create the database tables

In your Supabase project open **SQL Editor**, paste and run `supabase/migrations/20261115000000_private_test.sql`. This creates separate private test tables with RLS and no public permissions. It does not change the earlier chat scaffold.

## 2. Set Supabase Edge Function secrets

In Supabase → **Edge Functions → Secrets**, add:

- `PRIVATE_CHAT_CODE_1`: first random secret invitation code, 32+ random characters
- `PRIVATE_CHAT_CODE_2`: a **different** random secret code, 32+ random characters
- `PRIVATE_CHAT_SIGNING_SECRET`: another random secret, at least 32 characters
- `PRIVATE_CHAT_ORIGIN`: exactly `https://lonely-no-longer.pages.dev`

Generate the codes with a reputable password manager. **Do not put any of these secrets into GitHub or Cloudflare Pages.** Give each friend only their own invite code. Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in normal hosted environments; confirm they exist in your environment. Never expose service role keys to browsers.

## 3. Deploy the function

Supabase → Edge Functions → **Deploy a new function** → **Via Editor** (if offered). Name it `private-chat`, paste the entire contents of `supabase/functions/private-chat/index.ts`, and deploy. In function settings **turn OFF Verify JWT** (the function validates its own HMAC-signed short-lived sessions). If the dashboard doesn't support editor deployment, use the Supabase CLI: `supabase functions deploy private-chat --no-verify-jwt` after linking the project.

Function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/private-chat`.

## 4. Configure Cloudflare Pages

Cloudflare Pages project → Settings → Variables and Secrets → add a **plain text** build variable:
`NEXT_PUBLIC_PRIVATE_CHAT_FUNCTION_URL` = function URL above.

This is a **public endpoint URL**, not a secret. Trigger a **new deployment** after saving. Build command and output directory stay as documented in the root README.

Open `https://lonely-no-longer.pages.dev/private-chat/`. Each friend enters their own secret code. Messages refresh approximately every 2 seconds.

## Important limitations before testing

- A leaked invitation code gives access to its seat. Rotate secrets to revoke access. The seat is reused by anyone with that code; there is no user identity or identity proof.
- The demo has **no persistent blocking** (the Block button hides the chat only on that device), **no real human moderation workflow**, and only rudimentary filtering. Reports are saved in the database for the owner to review manually.
- It has **no durable server-side per-seat message rate limiting**, and is not suitable for public access. Restrict invitations to two trusted testers, never post codes publicly, and monitor Supabase usage.
- Browser-origin checks are not an authentication boundary. Secrets and signed tokens provide access control; protect your invite codes.
- No public matching, no media, no URLs. Text messages persist in the test database until deleted. Delete test data when finished.
- The existing `/chat` route remains a noninteractive public preview. Do not link the private route from the public homepage.
- Never reuse this private-test exception for public chat. Production requires genuine independent age assurance, abuse prevention, proper moderation and privacy review.
