# Marshmallow beta test

Manual walkthrough for a synchronized 10–20 tester session. Database time is authoritative. Do not write result rows by hand.

Finish `docs/LAUNCH_CHECKLIST.md` first (env, Confirm Email OFF, admin user, cron, email off). Question ideas: `docs/BETA_CONTENT.md`.

Session for analytics: **30 minutes from a user’s first seal**.

## Exact first-beta setup (Kitchen only — no SQL)

Preset:

- **3 promoted Quick** (TEST SESSION → Promoted pool)
- **3 queued Quick** (auto-fill when a promoted Quick closes)
- **1 Daily** for today’s UTC date
- Minimum sample **3–5** if the room is thin; default is 5. Set it yourself.

Steps:

1. Confirm Email off. `EMAIL_SENDING_ENABLED=false`.
2. Create 6 Quick (⚡ QUICK, open now / close 3m / target 4m / hard 10m). Use **Promote next** / reorder so only ~3 are promoted.
3. Schedule one Daily. Confirm no Daily conflict.
4. Click **Run due lifecycle jobs**. Promoted Quicks should be `open`.
5. If you are on Vercel Hobby, keep **Run due jobs** handy; Hobby cron is once per day.
6. Open Beta Health. Rates may be —; the blocks should still render.

Do not leave 10 Quicks equally promoted. Extra scheduled/open items can sit in the queue.

If a Quick hits target reveal with fewer than the minimum seals, testers see **Still cooking** until more seals or the hard reveal (~10 minutes from open). Voting stays closed after `closes_at`.

## Tester script

Expected states are in **bold**.

1. **Signup** — landing: *Predict what everyone else will choose.* Privacy / Terms / Community are drafts. Account + profile created. No confirm-email loop.
2. **Onboarding** — pick at least one world. Back works. Finish lands on a **promoted open Quick** when inventory exists.
3. **First Quick** — ⚡ QUICK + **Results soon**. Question first. Pick → predict → **SEAL MY MARSHMALLOW**.
4. **Sealed** — **SEALED**, countdown, “Your call is locked.” **PLAY ANOTHER** if another playable item exists; otherwise **HOME**. Same Quick is never re-offered.
5. **Play another** — next unsealed promoted Quick, then other eligible Quick, then Daily / Live.
6. **Still cooking** — target time passed, sample short: **Still cooking / We're waiting for a few more players.** No percentages.
7. **Ready** — after official finalize. Home: **☁️ N READY**. Nav badge updates on refetch. Play: **We’re finishing the count** if timestamps elapsed but status is not `revealed`.
8. **Reveal** — official crowd voice only (0 / Early crowd / N players / THE CROWD). **Accuracy**. **CrowdSense — Calibrating** until 5 official scores.
9. **Daily** — ☁️ DAILY + **Come back for the reveal**. Play streak increments on Daily seal only.
10. **Leave / return** — cooking shelf shows remaining time or **Waiting for players**. Quick has no inbox/email. Daily/Live get in-app Reveal Ready.
11. **Share** — after reveal. Invalid `/s/…` links show a friendly not-found, not a stack.

## First 5 minutes

0:00 — Finish onboarding, land on promoted Quick #1.  
0:30 — Pick, predict, seal. Tap **PLAY ANOTHER**.  
1:00 — Seal Quick #2, then #3 if still open.  
3:00–4:00 — Target reveal. If sample is short, Still cooking; keep chaining.  
4:00–10:00 — When Quick #1 is legitimately revealed, open it. Check Accuracy and CrowdSense calibrating. Play the Daily if you want the delayed return.

## What Beta Health should answer

Do not add dashboards. After the session, Kitchen already has:

- First seal rate (Users)
- Quick continuation and first payoff / median payoff delay (Quick activation)
- Promoted seal rate, promoted median sample, % reaching min before hard (Quick sample health)
- Daily RRR (Daily retention)
- Next play (Continuation)
- CrowdSense qualification (Skill)
- Share rate (Viral)

Numerators and denominators are always shown.

## Quality checks

- Ordinary users cannot read other entries, pre-reveal aggregates, or admin analytics.
- Countdown zero does not unlock numbers.
- Home READY and the browser title update on refetch only.
- TEST SESSION shows sealed counts only.
