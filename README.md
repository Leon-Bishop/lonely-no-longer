# Lonely No Longer

Anonymous one-to-one text chat for adults in Ireland — **currently a safe, non-interactive design preview**.

## Deploy the FREE website preview on Cloudflare Pages

The Next.js frontend is configured for **static export** (`apps/web/next.config.ts`). It does not require a paid server or database to show the design. It does **not** yet connect visitors or send messages.

1. In Cloudflare, open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choose GitHub repository **Leon-Bishop/lonely-no-longer** and branch **main**.
3. Configure:
   - **Framework preset:** Next.js (Static HTML Export) if offered; otherwise None/Custom
   - **Root directory:** `apps/web`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Environment variables:** none required for preview
4. Click **Save and Deploy**. Cloudflare provides a free `*.pages.dev` address.
5. To publish changes, push commits to main. Cloudflare normally redeploys automatically.

**If Cloudflare fails to install dependencies from the workspace:** use **Root directory** `/`, **Build command** `npm install && npm run build -w @lnl/web`, and **Build output directory** `apps/web/out`.

Do not enter Supabase database passwords or service-role keys into the Cloudflare frontend environment variables.

## Supabase setup

You may create a free Supabase project in an EU region now, but it is **not connected to the live preview**. `supabase/migrations/20261114000000_private_chat_scaffold.sql` is a locked-down schema starter. It has row-level security enabled and no public access policies. See [supabase/README.md](supabase/README.md).

## Local API prototype (NOT deployed)

The old Node.js Express + Socket.IO + Prisma code is in `apps/api`. It is for private, local development only. Its simulated age assurance **does not verify age**, and the server refuses to start with the mock in production. It is not compatible with the free static Pages deployment as-is.

To run that prototype locally with Node 20+, npm and Docker:

```bash
cp .env.example .env
cp .env apps/api/.env
docker compose up -d db
npm install
npm run db:generate
npm run db:migrate -- --name initial_one_to_one
npm run dev
```

Local frontend: http://localhost:3000; local API: http://localhost:4000.

## What must happen before real chat is enabled

- Integrate a genuine third-party 18+ age-assurance provider. The app must only store pass/fail and timestamp; never face images or ID.
- Implement server-side verified sessions and atomic one-to-one matching using Supabase Edge Functions/Postgres; no anonymous direct database writes.
- Implement effective moderation for sexual content, grooming, abuse, personal information, crisis support, reports and blocks, plus trained human review.
- Add secure moderator accounts, abuse prevention, data retention/deletion, GDPR review, and independent security testing.
- Validate costs, quotas and EU hosting.

**Do not remove the age-check guard or open the messaging API to the public to make a quick demo.**

Ireland crisis contacts: Samaritans **116 123**; Pieta **1800 247 247**; emergency **112 or 999**.
