# Lonely No Longer — anonymous one-to-one chat MVP

**No login, no signup, no profiles, no chat rooms.** Adults in Ireland receive a random nickname after age assurance and are matched with **one** other available visitor for a text-only conversation. They can leave, report and block.

## Safety: development prototype ONLY

This code is **NOT approved for public launch or unsupervised public testing**. The age-verification provider currently simulates age verification and does **not** establish a person's age. The backend intentionally refuses to start with the mock provider when `NODE_ENV=production`. Local rules-based moderation is incomplete and cannot guarantee safety. Do not remove that production guard just to deploy a public test site.

To test privately, use localhost or a tightly access-controlled environment limited to authorized adult testers. Before public access, integrate an independent age-assurance provider with signed evidence, professionally evaluated moderation, human response procedures, repeat-offender controls, concurrency-safe matchmaking, and legal/GDPR review.

## Project structure

- `apps/web` — Next.js, React and Tailwind; homepage, age-gate screen, live chat, report/block controls, moderation dashboard and policy pages
- `apps/api` — Express, Socket.IO, PostgreSQL and Prisma; temporary anonymous sessions, matching, messaging, reports, bans and audit logs
- `apps/api/src/age/provider.ts` — pluggable age check, local mock only
- `apps/api/src/moderation/filter.ts` — basic content and crisis-language screening
- `apps/api/prisma/schema.prisma` — database schema
- `docker-compose.yml` — local PostgreSQL container
- `.env.example` — local development settings (safe to commit); **never** commit `.env`

## Start locally

Prerequisites: **Node.js 20+**, **npm**, **Docker with Compose**.

From the repository root:

```bash
cp .env.example .env
cp .env apps/api/.env
docker compose up -d db
npm install
npm run db:generate
npm run db:migrate -- --name initial_one_to_one
npm run dev
```

Browse to **http://localhost:3000**. For a one-to-one matching test, open a *second incognito window or separate browser profile*. In both browsers choose **Find your people**, accept rules and complete the visibly labelled local mock age-check. The first visitor waits for the second. Messages travel via Socket.IO. Try report, block and leave.

The API listens on **http://localhost:4000** and the health endpoint is `/api/health`. Set `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` to the proper origins if ports change.

### Moderator dashboard

Start a temporary session and note its nickname. From the repo root:

```bash
npm run promote -w @lnl/api -- YOUR_RANDOM_NICKNAME YOUR_ADMIN_SEED_SECRET
```

Use the value of `ADMIN_SEED_SECRET` in your local `.env`. Refresh `/admin` to inspect reports, mute/ban sessions and audit actions. This local promotion method is **not suitable for production staff authentication**.

## Hosting and live browser testing

**GitHub stores source code; it does not run this Node.js + WebSocket + PostgreSQL application.** Static GitHub Pages cannot host real-time pairing. A deployment will need:

1. A long-running Node.js service with WebSocket support for `apps/api`, plus PostgreSQL, hosted in an EU region.
2. A Next.js deployment for `apps/web` (for example on Vercel or the same full-stack provider).
3. A matching backend URL, frontend URL, secure cookie setup and appropriate origin/CORS configuration. Cross-site cookies may require a shared parent domain or same-origin reverse proxy; the localhost defaults will not suffice.
4. Restricted access for development testing. Before opening the site to the public, replace mock verification and basic filters and audit operational safety.

The in-memory matchmaking queue handles **one API process only**, not multiple replicas; use Redis or a transactional DB queue before scaling.

## Privacy and retention

Temporary user records are necessary for matching and moderation even though visitors never create accounts. Only a pseudonymous alias appears in chat. Sessions use hashed server-side tokens and HTTP-only cookies. The app stores age-check pass/fail and timestamp, *not images or identity documents*. Messages are cleaned up after about 24 hours by an hourly job; reports and audit data require a defined retention and rights-request workflow before launch. Policies under `/privacy` and `/terms` are drafts requiring Irish/EU legal review.

Crisis help in Ireland: **Samaritans 116 123**, **Pieta 1800 247 247**; immediate danger **112 or 999**.

## Remaining work before production

- Proper age-assurance vendor implementation and bypass tests
- Human-in-the-loop sexual, grooming, harassment and personal-data moderation; independent safety testing
- Atomic matchmaking and WebSocket authorization/concurrency integration tests
- Resilient rate limits, anti-bot controls, ban evasion mitigation and escalation playbooks
- Strong separate moderator identity with MFA
- EU deployment, TLS, monitoring, backups, secret storage and GDPR DPIA
- Security, accessibility, usability and deletion/retention verification
