# Supabase integration status

This folder is a **secure database scaffold**, not a working chat service. The current Cloudflare Pages deployment is a static preview only. The prior Express/Socket.IO API under apps/api is a separate local-development prototype and is **not connected** to the static site.

The SQL migration creates private chat tables with RLS enabled and **no browser-facing policies**. As a result, a publishable/anon key cannot read or write these records. Do not disable RLS or add permissive policies just to make chat work.

Next implementation steps:
1. Select an independent age-assurance vendor and implement a signed server-side result handler in Supabase Edge Functions. Store only pass/fail and timestamp. Never handle biometrics or ID documents in the application.
2. Issue short-lived verified session credentials and protect matching, messaging and moderation through server-side functions. Never trust a browser-supplied verified flag.
3. Use transactional database matching with per-user locks, blocking, rate limits, and concurrency tests.
4. Add a human moderation queue, stronger content moderation, retention/deletion procedures, staff MFA and EU legal/privacy review.
5. Only after these are ready, add narrowly scoped RLS policies and enable Realtime for authorized messages.

You can create a Supabase project now, but **do not run this migration unless you are preparing the backend**. No Supabase keys or passwords are required for the static preview.
