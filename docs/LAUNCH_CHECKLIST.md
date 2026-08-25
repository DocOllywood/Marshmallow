# First-beta launch checklist

Use this before inviting 10–20 testers. Do not put secrets in this file or in chat.

## Hosted Supabase

- Project is linked and reachable from the Vercel app (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `SUPABASE_SERVICE_ROLE_KEY` is set on the server only (Vercel, never `NEXT_PUBLIC_`).
- Latest applied migration is `20260821000020_quick_rotation` (or newer). If Kitchen TEST SESSION has no promoted pool, push migrations.

## Auth

- Authentication → Providers → Email: **enabled**.
- **Confirm Email: OFF** (testers go straight to onboarding).
- Site URL: production origin (same as `NEXT_PUBLIC_SITE_URL`).
- Redirect URLs include `{SITE_URL}/auth/callback`.
- Promote the operator account: `profiles.role = 'admin'` for that user. Kitchen is `/admin`.

## Vercel env (no values here)

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (production https origin, no trailing slash)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (long random string; cron sends `Authorization: Bearer $CRON_SECRET`)

Email stays disabled:

- `EMAIL_SENDING_ENABLED=false`
- `EMAIL_PROVIDER=noop`

Do not set `RESEND_API_KEY` for this beta.

## Lifecycle cron

- `vercel.json` schedules `GET /api/cron/lifecycle` every minute.
- **Hobby** only runs Vercel Cron **once per day**. For a live 10-person session, click Kitchen **Run due lifecycle jobs** as needed, or use Pro.
- Cron never reveals early. Database `now()` is authoritative.

## Beta operating mode

- This is a closed beta. No Marshmallow+, payments, native push, or social graph.
- Privacy, Terms, and Community Guidelines are **drafts for attorney review**.
- Email Reveal Ready stays off. Daily/Live use in-app inbox only. Quick does not inbox.

## Content before invite

- **1 Daily** scheduled for today’s UTC date.
- **3 promoted open Quick** plus **3 queued Quick** (TEST SESSION). Extra inventory is fine; do not promote all of them.
- Minimum sample is operator-set (default 5; 3–5 is OK for a thin room). The app will not lower it.
- Leave Live empty unless a real event is unfolding.

## Kitchen sanity

- TEST SESSION: promoted pool, sealed counts only, queued list, Promote next.
- Beta Health answers: first seal rate, Quick continuation, first payoff / median payoff delay, Quick sample health, Daily RRR, next play, CrowdSense qualification, share rate.
- No option percentages on TEST SESSION before reveal.
