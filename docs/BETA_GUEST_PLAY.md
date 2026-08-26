# Beta guest play (anonymous auth)

Beta 1 removes email signup friction. New testers tap **PLAY MARSHMALLOW** and enter via a persistent Supabase anonymous session.

## Prerequisites (hosted)

**Supabase Dashboard → Authentication → Providers → Anonymous sign-ins → Enable**

Local `supabase/config.toml` sets `enable_anonymous_sign_ins = true`. Hosted must be toggled manually (verified 2026-08-26: hosted returned `Anonymous sign-ins are disabled` until enabled).

No SQL migration required.

## Flow

| Step | Behavior |
|------|----------|
| Landing **PLAY MARSHMALLOW** | `signInAnonymously()` if no session; else route to `/home` or `/onboarding` |
| Profile | `handle_new_user` trigger creates `profiles` row with `allocate_fallback_username()` |
| Onboarding | Unchanged — `complete_onboarding` RPC |
| Gameplay | Full authenticated path via `auth.uid()` |

## Persistence

- Session stored in Supabase auth cookies (same SSR middleware as email users)
- Same browser → same `user_id` → Daily progress, scores, events preserved
- Clearing cookies / new device → new anonymous user (history not recoverable until account linked)

**Beta tradeoff:** Acceptable for Beta 1. No device fingerprinting.

## Email users unchanged

- `/signup` and `/login` remain
- Landing secondary links: **Already have an account? Log in** · **Create an account**
- Email/password accounts unaffected

## Future: guest → permanent account

Supabase supports upgrading an anonymous user without changing `user_id`:

1. **Recommended (later):** `supabase.auth.updateUser({ email, password })` on the anonymous session — preserves entries, scores, retention history
2. **Alternative:** Identity linking (`linkIdentity`) — requires enabling manual linking in Supabase Auth settings

Do not implement conversion in Beta 1 unless explicitly scoped.

## Security

Anonymous users are `authenticated` JWT role — same RLS as email users. No policy changes required.

## Email notifications

Guests have no email. Reveal-ready email outbox skips with `recipient_ineligible` — in-app notifications still work.
