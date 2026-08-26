# Part 13 test round — internal QA only

**HONESTY vs. KINDNESS** · *When does honesty become cruelty?*

This round is **not** today's public Daily on Home until its `round_date` (UTC today+3 at seed time). It is opened for **direct-URL staff QA** only.

## IDs

| Item | UUID |
|------|------|
| Daily round | `40000000-0000-4000-8000-000000000004` |
| Q1 | `31000000-0000-4000-8000-000000000010` |
| Q2 | `31000000-0000-4000-8000-000000000011` |
| Q3 | `31000000-0000-4000-8000-000000000012` |
| Q4 (Switch) | `31000000-0000-4000-8000-000000000013` |
| Q5 (Line) | `31000000-0000-4000-8000-000000000014` |
| Reveal page | `/daily/40000000-0000-4000-8000-000000000004/reveal` |

Migration `20260825230200_open_part13_test_round.sql` keeps marshmallows **open** with long `closes_at` without promoting the round on Home.

## Playthrough (production-safe)

1. Log in as a **test account** (not a real beta user you are tracking).
2. Open Q1: `/m/31000000-0000-4000-8000-000000000010`
   - Confirm **HONESTY / vs. / KINDNESS** header
3. Complete Q1 → Q2 → Q3 (Pick → Predict → Lock)
4. Q4: pick → **Switch** prompt → stay or switch → Predict → Lock
5. Q5: tap Line threshold → instant seal
6. After Q5: **Today's Read** with narrative + optional tomorrow tease
7. Wait for reveal window OR run lifecycle / admin finalize on hosted DB for test marshmallows
8. Open `/daily/40000000-0000-4000-8000-000000000004/reveal`
   - Gate → Reveal → **Gap** on Q1–Q4, no Gap on Q5
   - Accuracy + CrowdSense on summary

## What does NOT change for public users

- Today's live Daily (`round_date = UTC today`) remains the legacy **Can love survive complete honesty?** round
- Home only shows the round whose `round_date` matches UTC today
- Historical entries on the live round are untouched

## If marshmallows are closed

Re-apply via Supabase SQL editor (service role):

```sql
UPDATE marshmallows
SET status = 'open', expires_at = NULL,
    opens_at = now() - interval '1 hour',
    closes_at = now() + interval '48 hours',
    reveals_at = now() + interval '49 hours'
WHERE daily_round_id = '40000000-0000-4000-8000-000000000004';
```

Then advance lifecycle when ready to reveal.

## Do not

- Change `round_date` to today while the legacy round is live (unique constraint + wrong public Daily)
- Assign this round to beta testers via Home until intentionally scheduled
