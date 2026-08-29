# Money Era Beta Runbook

Operational guide for launching the first 10–30 user Money Week cohort. **Do not promote a round until the founder explicitly approves that day's go-live.**

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

## Proposed Beta calendar (US Eastern)

Assumes cohort launch **Monday 2026-09-08** (founder adjusts dates at promotion time). Pattern each day:

| Phase | Local (ET) | UTC (EDT, UTC-4) |
|-------|------------|------------------|
| Open | 8:00 AM | 12:00 |
| Close | 9:00 PM | 01:00 (+1 day) |
| Reveal | 11:30 PM | 03:30 (+1 day) |

**Play window:** ~13 hours. **Reveal wait:** 2.5 hours after close.

| Day | Round ID | Title | Local date | Open UTC | Close UTC | Reveal UTC |
|-----|----------|-------|------------|----------|-----------|------------|
| 1 | …000009 | Partner dream job | Mon 2026-09-08 | 2026-09-08T12:00:00Z | 2026-09-09T01:00:00Z | 2026-09-09T03:30:00Z |
| 2 | …000010 | Cover for a friend | Mon 2026-09-15 | 2026-09-15T12:00:00Z | 2026-09-16T01:00:00Z | 2026-09-16T03:30:00Z |
| 3 | …000011 | Bigger paycheck | Mon 2026-09-22 | 2026-09-22T12:00:00Z | 2026-09-23T01:00:00Z | 2026-09-23T03:30:00Z |
| 4 | …000012 | Private story | Mon 2026-09-29 | 2026-09-29T12:00:00Z | 2026-09-30T01:00:00Z | 2026-09-30T03:30:00Z |
| 5 | …000013 | Equal fair? | Mon 2026-10-06 | 2026-10-06T12:00:00Z | 2026-10-07T01:00:00Z | 2026-10-07T03:30:00Z |
| 6 | …000014 | Promotion belief | Mon 2026-10-13 | — | — | — |
| 7 | …000015 | Co-sign family | Mon 2026-10-20 | — | — | — |

**Note:** Days 6–7 QA dates currently conflict with Blind Mirror / guitar QA on those calendar dates — **reassign `round_date` at promotion** to non-conflicting live dates (e.g. 2026-10-14 and 2026-10-21).

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
| `next_daily_return` | User returned for next Daily |
| `prediction_started` | Flip prediction begun |
| `prediction_sealed` | Flip prediction locked |
| `waiting_viewed` / `waiting_returned` | Wait screen engagement |
| `share_created` / `share_opened` / `share_play_clicked` | Share funnel |
| `notification_clicked` | Notification engagement |
| `home_viewed` | Home feed view |
| `gap_viewed` | Gap / between-stage UI |

No external analytics service required — events flow through existing `trackEvent` → Supabase.

---

## Beta funnel (definitions)

| Step | Numerator | Denominator | Event / source |
|------|-----------|-------------|----------------|
| Daily view | Users with `daily_viewed` | Eligible users (invited, onboarded) | `daily_viewed` |
| Daily start | `daily_started` | `daily_viewed` | analytics |
| Q1 sealed | `daily_question_locked` where stage=1 | `daily_started` | analytics payload |
| Q3 reached | `daily_question_locked` where stage=3 | `daily_started` | analytics payload |
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

- [ ] Founder promotes Day 1 explicitly (not done in prep tasks)
- [ ] `metadataBase` set for production OG URLs (build currently warns)
- [ ] Lifecycle cron authorized in production
- [ ] Day 6/7 live dates avoid QA collisions
- [ ] 10–30 invite list ready
