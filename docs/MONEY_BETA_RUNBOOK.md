# Money Era Beta Runbook

Operational guide for launching the first 10–30 user Money Week cohort. **Do not promote a round until the founder explicitly approves that day's go-live.**

---

## Beta research question (primary)

This beta is **not** “Do people like Marshmallow?”

**Primary question:** Will someone voluntarily complete one escalating dilemma, care about where their Line landed, return for the crowd reveal, and then play another dilemma the next day?

**Secondary questions:**

- Do they comprehend Instinct → Pressure → Price → Flip → Line?
- Does their answer move when cost rises?
- Do they debate it with someone else?
- Do they want to share the question?

---

## Round inventory (Money Week)

| Day | Round ID | QA `round_date` | Title | Direct QA (Q1) |
|-----|----------|-----------------|-------|----------------|
| 1 | `40000000-0000-4000-8000-000000000009` | 2026-10-27 | Would you move for their dream job? | `/m/31000000-0000-4000-8000-000000000050` |
| 2 | `40000000-0000-4000-8000-000000000010` | 2026-11-03 | How much should you cover for a friend? | `/m/31000000-0000-4000-8000-000000000060` |
| 3 | `40000000-0000-4000-8000-000000000011` | 2026-11-10 | What would you trade for a bigger paycheck? | `/m/31000000-0000-4000-8000-000000000070` |
| 4 | `40000000-0000-4000-8000-000000000012` | 2026-11-17 | Would you sell a private story? | `/m/31000000-0000-4000-8000-000000000080` |
| 5 | `40000000-0000-4000-8000-000000000013` | 2026-11-24 | Is equal always fair? | `/m/31000000-0000-4000-8000-000000000090` |
| 6 | `40000000-0000-4000-8000-000000000014` | 2026-12-01 | Would you take a promotion you don't believe in? | `/m/31000000-0000-4000-8000-000000000100` |
| 7 | `40000000-0000-4000-8000-000000000015` | 2026-12-08 | Would you co-sign for family? | `/m/31000000-0000-4000-8000-000000000110` |

All rounds are **draft** until promoted. QA dates must not collide with Blind Mirror (`2026-10-13`) or guitar Price QA (`2026-10-20`).

---

## Before launch day

1. **Verify exact round** — confirm `daily_rounds.id`, `title`, `tension_id`, `principle_id`, and `metadata.experiment.archetype = price`.
2. **Verify draft/open state** — round `status = draft` until promotion; after promotion, marshmallows transition via lifecycle cron.
3. **Manual editorial read** — play all five stages on phone width; confirm Q1 reads in one pass; confirm Flip side semantics.
4. **Direct QA** — open Q1 URL above; confirm play → seal → Today's Read → waiting → reveal path.
5. **Timestamps** — set `opens_at`, `closes_at`, `reveals_at`, `hard_reveals_at` before promotion (see Proposed calendar below).
6. **Component count** — exactly 5 marshmallows per round; positions 1–5; Q5 is Line (`is_line = true`).
7. **Reveal timing** — confirm reveal is **2.5 hours after close** (recommended Beta cadence).

Checklist query (hosted):

```sql
SELECT dr.id, dr.round_date, dr.status, dr.title,
       ht.slug AS tension, bp.slug AS principle,
       dr.metadata->'experiment'->>'price_reference_side' AS ref_side,
       count(m.id) AS marshmallow_count
FROM daily_rounds dr
LEFT JOIN human_tensions ht ON ht.id = dr.tension_id
LEFT JOIN belief_principles bp ON bp.id = dr.principle_id
LEFT JOIN marshmallows m ON m.daily_round_id = dr.id
WHERE dr.id = '<ROUND_ID>'
GROUP BY dr.id, ht.slug, bp.slug;
```

---

## Promotion (one round → live)

**Safe process — no editing after real users seal.**

1. Pick target **UTC `round_date`** (must be unique; one round per calendar day).
2. Update `daily_rounds.round_date` to target date (only while still draft and no production entries).
3. Set marshmallow lifecycle timestamps for that date (see calendar section).
4. Change `daily_rounds.status` from `draft` to `scheduled` or rely on lifecycle to open at `opens_at`.
5. Ensure `marshmallows.daily_on` matches promoted `round_date`.
6. Run lifecycle: `POST /api/cron/lifecycle` (authorized) or admin `run_due_lifecycle`.
7. **Fresh guest smoke** — incognito signup → onboarding → Home → start Daily → seal Q1 → confirm no broken CTA.
8. **Do not** edit question copy, choice sides, or Line options after the first seal from a real user.

**Never promote two Money Week rounds on the same `round_date`.**

---

## During play

### What the founder watches

- Admin beta health / event counts (if enabled)
- `daily_started` vs `daily_viewed` drop-off
- Support messages / DMs
- Error logs from lifecycle cron

### Normal

- Users take 3–8 minutes to complete five stages
- Some users stop after Q1 or Q3
- Waiting screen shown between close and reveal
- Flip prediction takes longer than binary stages

### Emergency (intervene)

- Wrong question live / inverted Flip sides
- Reveal available before close
- Home shows wrong round or draft round
- Sealed entries lost or overwritable
- Crowd results visible before reveal gate

### When NOT to intervene

- Low completion rate on day 1 (expected)
- Users disagree in qualitative feedback
- Individual user confusion (note for interview, don't patch mid-day)

---

## Close

1. Confirm lifecycle cron ran (`closed_count` > 0 when due).
2. Verify marshmallows `status = closed` and `now() >= closes_at`.
3. Confirm no new seals accepted after close (RPC should reject).

---

## Reveal

1. Confirm `now() >= reveals_at` and lifecycle moved marshmallows to revealed state.
2. Verify **minimum sample gate** if configured (`minimum_result_sample`).
3. Confirm users without sealed entries cannot open reveal early.
4. Spot-check: crowd trajectory, Today's Read, Line copy — no pre-reveal leakage on Home or API.

---

## Next morning

Capture for the previous day:

| Metric | Source |
|--------|--------|
| Home/Daily views | `daily_viewed` |
| Starts | `daily_started` |
| Q1 seals | `daily_question_locked` (position 1) |
| Completions | `daily_completed` |
| Today's Read | `todays_read_viewed` |
| Reveal opens | `daily_reveal_opened` |
| Next-day return | `next_daily_return` |

Review qualitative notes (see interview questions below). Prep next day's promotion checklist.

---

## Cancel / emergency

**When to cancel**

- Material editorial error discovered after promotion
- Legal/privacy concern in live copy
- Data integrity bug affecting seals or reveal

**What cancellation does**

- Set round/marshmallow `cancelled_at` via admin (do not delete rows)
- Users who sealed retain entries; do not mutate answered questions
- Home should no longer surface cancelled round

**Never**

- Change copy on a marshmallow with sealed entries
- Re-open a closed round for edits
- Force-reveal early to "fix" crowd numbers

---

## Proposed Beta calendar — seven consecutive days (US Eastern)

**First cohort start:** Wednesday **2026-09-02**.  
**Daily cadence (EDT, UTC−4):** open 08:00 ET · close 21:00 ET · reveal 23:30 ET.

| Phase | Eastern | UTC (EDT) |
|-------|---------|-----------|
| Open | 08:00 same calendar day | 12:00 same day |
| Close | 21:00 same calendar day | 01:00 **next** UTC day |
| Reveal | 23:30 same calendar day | 03:30 **next** UTC day |

**Play window:** ~13 hours. **Reveal wait:** 2.5 hours after close.

| Day | Weekday | Calendar date | Round ID | Title | Open UTC | Close UTC | Reveal UTC |
|-----|---------|---------------|----------|-------|----------|-----------|------------|
| 1 | Wed | 2026-09-02 | `…000009` | Would you move for their dream job? | 2026-09-02T12:00:00Z | 2026-09-03T01:00:00Z | 2026-09-03T03:30:00Z |
| 2 | Thu | 2026-09-03 | `…000010` | How much should you cover for a friend? | 2026-09-03T12:00:00Z | 2026-09-04T01:00:00Z | 2026-09-04T03:30:00Z |
| 3 | Fri | 2026-09-04 | `…000011` | What would you trade for a bigger paycheck? | 2026-09-04T12:00:00Z | 2026-09-05T01:00:00Z | 2026-09-05T03:30:00Z |
| 4 | Sat | 2026-09-05 | `…000012` | Would you sell a private story? | 2026-09-05T12:00:00Z | 2026-09-06T01:00:00Z | 2026-09-06T03:30:00Z |
| 5 | Sun | 2026-09-06 | `…000013` | Is equal always fair? | 2026-09-06T12:00:00Z | 2026-09-07T01:00:00Z | 2026-09-07T03:30:00Z |
| 6 | Mon | 2026-09-07 | `…000014` | Would you take a promotion you don't believe in? | 2026-09-07T12:00:00Z | 2026-09-08T01:00:00Z | 2026-09-08T03:30:00Z |
| 7 | Tue | 2026-09-08 | `…000015` | Would you co-sign for family? | 2026-09-08T12:00:00Z | 2026-09-09T01:00:00Z | 2026-09-09T03:30:00Z |

Set `round_date` to each **calendar date** at promotion. QA dates in DB stay unchanged until then.

---

## Lifecycle cron

**Job:** `GET/POST /api/cron/lifecycle` → `runDueLifecycle("cron")` → Supabase RPC `run_due_lifecycle`.

**What it does:**

1. `scheduled` → `open` when `opens_at <= now()`
2. `open` → `closed` when `closes_at <= now()`
3. `closed` → `revealed` when `ready_to_finalize()` — requires `now() >= reveals_at`, and either enough sealed entries **or** `now() >= hard_reveals_at`

**Repo schedule (`vercel.json`, UTC):** `0 1`, `30 3`, `0 2`, `0 8` daily.

**Verify in Vercel:** `CRON_SECRET` env var; cron jobs active after deploy.

---

## Production metadata

```
NEXT_PUBLIC_SITE_URL=https://mallowup.com
```

Root layout `metadataBase` reads this env var. Localhost when unset.

---

## Founder Day 1 play checklist

**LANDING** — “What’s your price?” sets right expectation?  
**Q1** — One-read understandable?  
**Q2** — One new fact, not a new scenario?  
**Q3** — Your $68k sacrifice feels like *your* price?  
**Q4 Flip** — Fair, not accusatory?  
**READ THE ROOM** — Secondary to your call?  
**Q5 Line** — Payoff, not survey?  
**TODAY'S READ** — Movement without diagnosis?  
**OUTSIDE** — Quiet, not preachy?  
**WAIT** — Clear when to return?

---

## Reveal cadence decision

**Recommended: Option B — reveal ~2.5 hours after close (same evening ET).**

| Option | Pros | Cons |
|--------|------|------|
| A. Same evening (immediate) | Instant gratification | No anticipation; crowd may not be ready |
| **B. 2–3 h after close** | **Evening habit; time to return; crowd accumulates** | Late night for West Coast |
| C. Next morning | Clean ritual | High abandonment overnight |

Beta cohort is US Eastern–weighted — same-evening reveal with a short wait tests whether users ** willingly return** without losing them overnight.

---

## Analytics inventory (existing)

Events in `src/lib/analytics/events.ts`:

| Event | Purpose |
|-------|---------|
| `daily_viewed` | User saw Daily on Home or entry |
| `daily_started` | User began Daily play |
| `daily_question_locked` | User sealed a stage (filter by position in payload) |
| `daily_completed` | User finished all five stages |
| `todays_read_viewed` | User viewed Today's Read |
| `daily_reveal_available` | Reveal gate passed / available state shown |
| `daily_reveal_opened` | User opened reveal |
| `next_daily_return` | User tapped **PLAY ANOTHER** after reveal (`DailyRoundRevealExperience`) |
| `prediction_started` / `prediction_sealed` | Flip prediction flow |
| `waiting_viewed` / `waiting_returned` | Wait screen (`/m/[id]` when closed, not yet reveal) |
| `share_*` / `notification_clicked` / `home_viewed` / `gap_viewed` | Secondary funnel |

**`next_daily_return` semantics:** Explicit button click after viewing reveal — not automatic next-day return and not starting the next Daily.

Events flow through `trackEvent` → Supabase. Payload includes `round_id` and/or `position` where applicable; entity id column stores round or marshmallow UUID.

---

## Beta funnel (definitions)

| Step | Numerator | Denominator | Event / source |
|------|-----------|-------------|----------------|
| Daily view | Users with `daily_viewed` | Eligible users (invited, onboarded) | `daily_viewed` |
| Daily start | `daily_started` | `daily_viewed` | analytics |
| Q1 sealed | `daily_question_locked` where `payload.position = 1` | `daily_started` | analytics payload |
| Q3 reached | `daily_question_locked` where `payload.position = 3` | `daily_started` | analytics payload |
| Q5 completed | `daily_completed` | `daily_started` | analytics |
| Today's Read | `todays_read_viewed` | `daily_completed` | analytics |
| Reveal returned | `daily_reveal_opened` | Users who completed before close | analytics |
| Next Daily | `next_daily_return` | Users who opened reveal | analytics |

---

## Qualitative interview questions

Ask 3–5 users after their first full Daily (async DM or call):

1. What did you think Marshmallow was before playing?
2. What do you think it is now?
3. Which stage made you stop and think?
4. Did your answer change?
5. Did THE LINE feel meaningful or arbitrary?
6. Did you want to know the crowd?
7. Would you come back for reveal?
8. Would you play tomorrow?
9. Would you send the question to someone?
10. What felt confusing or gimmicky?

---

## Learning signals

| Signal | What you hear |
|--------|----------------|
| **Strong** | Users describe their answer, Line, and compare with others; ask when reveal drops |
| **Mixed** | Enjoy the question but forget reveal; complete play but don't return |
| **Weak** | Treat it as a quick poll; can't recall stages |
| **Bad** | Think it's finance advice, personality test, or "would you do X for money" game |

No KPI thresholds for Beta — qualitative pattern recognition first.

---

## Pre-invite blockers

- [ ] Founder promotes Day 1 explicitly
- [ ] `NEXT_PUBLIC_SITE_URL=https://mallowup.com` in Vercel production env
- [ ] Deploy with `metadataBase` fix (see Production metadata)
- [ ] `CRON_SECRET` set; Vercel cron invocations confirmed in logs
- [ ] Deploy with updated `vercel.json` cron schedules
- [ ] Founder Day 1 play checklist completed
- [ ] 10–30 invite list ready
