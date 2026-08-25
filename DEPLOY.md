# Deploy Marshmallow (GitHub + Vercel)

## 1. GitHub push

```bash
git init   # if needed
git add .
git commit -m "Prepare Marshmallow for production deploy"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/marshmallow.git
git push -u origin main
```

Ensure `.env.local` and other secrets are **not** committed (`.gitignore` ignores `.env*` except `.env.example`).

## 2. Vercel import

1. [vercel.com/new](https://vercel.com/new) → Import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Root directory: `.`
4. Build command: `npm run build` (default)
5. Output: Next.js default (no custom output directory)

## 3. Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, Preview, and Development as needed).

| Variable | Scope | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes |
| `NEXT_PUBLIC_SITE_URL` | Public | Yes (production: `https://mallowup.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes |
| `CRON_SECRET` | Server only | Yes (random secret; Vercel Cron sends `Authorization: Bearer …`) |
| `EMAIL_SENDING_ENABLED` | Server only | No (MVP: `false`) |
| `EMAIL_PROVIDER` | Server only | No (MVP: `noop`) |
| `EMAIL_FROM` | Server only | No |
| `RESEND_API_KEY` | Server only | No |

Copy names from `.env.example`. Never commit real values.

**Local dev:** copy `.env.example` → `.env.local` and fill values. `NEXT_PUBLIC_SITE_URL` may be `http://localhost:3000` locally only.

## 4. Deploy

1. Add env vars in Vercel, then deploy (push to `main` or **Deploy** from the dashboard).
2. Confirm build succeeds (`npm run build` locally if debugging).
3. `vercel.json` registers cron `GET /api/cron/lifecycle` once daily at **08:00 UTC** (`0 8 * * *`). On **Vercel Hobby**, that is the compatible schedule. During controlled beta, use admin **Run due lifecycle jobs** for Quick/Live timing between cron runs. **Pro** can restore a more frequent schedule later if needed.

## 5. Connect mallowup.com

1. Vercel → **Settings → Domains** → Add `mallowup.com` and `www.mallowup.com`.
2. At your DNS host, add the records Vercel shows (typically `A` / `CNAME` to Vercel).
3. Wait for SSL provisioning (automatic).
4. Set primary domain to `mallowup.com` if desired; redirect `www` → apex or vice versa per preference.
5. Update `NEXT_PUBLIC_SITE_URL` to `https://mallowup.com` and redeploy.

## 6. Supabase production auth URLs

In **Supabase Dashboard → Authentication → URL configuration**:

| Setting | Value |
| --- | --- |
| **Site URL** | `https://mallowup.com` |
| **Redirect URLs** | `https://mallowup.com/auth/callback` |
| | `http://localhost:3000/auth/callback` (keep for local dev) |

**Email provider (MVP):** enable Email; **Confirm email: OFF** (matches current app assumptions).

Apply pending migrations to the linked project before first production smoke test:

```bash
npx supabase db push
```

## 7. Production smoke-test checklist

- [ ] `/` landing loads on `https://mallowup.com`
- [ ] Sign up → redirects through `/auth/callback` → onboarding or `/home`
- [ ] Log in / log out works
- [ ] `/home` shows Quick hero, Daily, and sections when content exists
- [ ] Play a Quick: choice → predict → seal → cooking → reveal
- [ ] Play the Daily: seal → “Come back tonight” copy on wait
- [ ] `/notifications` inbox loads
- [ ] `/profile` and `/settings` load
- [ ] Cron or admin **Run due jobs** advances lifecycle (open → close → reveal)
- [ ] No console errors on critical paths; bottom nav clears CTAs on mobile
