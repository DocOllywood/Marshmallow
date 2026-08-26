# Beta retention & funnel metrics

Internal definitions only. No dashboard in this phase — query `product_events`, `entries`, and `daily_rounds` directly.

## Cohort

**First Daily completers**

Users whose first `daily_completed` event occurs on date **D₀** (UTC calendar date of event timestamp).

Alternative SQL anchor: first day a user seals all 5 questions in a `daily_rounds` row (`entries.sealed_at` count = 5 for that round's marshmallow IDs).

Use one definition consistently; prefer `daily_completed` when present.

## Retention (D1 / D3 / D7 / D14)

For cohort users who first completed a Daily on **D₀**:

| Metric | Definition |
|--------|------------|
| **D1 return** | Any `daily_started` OR `daily_completed` on **D₀+1** (UTC date) |
| **D3 return** | Same activity on **D₀+3** |
| **D7 return** | Same activity on **D₀+7** |
| **D14 return** | Same activity on **D₀+14** |

**Return = meaningful Daily activity**, not merely `home_viewed`.

Optional stricter return: `daily_completed` only (completed another full Daily).

## Funnel rates

| Metric | Numerator | Denominator |
|--------|-----------|-------------|
| **Daily start rate** | Users with `daily_started` on date D | Users with `daily_viewed` on date D |
| **Daily completion rate** | Users with `daily_completed` on date D | Users with `daily_started` on date D |
| **Drop-off by question** | Users with `daily_question_locked` at position N but not N+1 same day | Users with `daily_question_locked` at position N−1 |
| **Today's Read view rate** | `todays_read_viewed` | `daily_completed` (same round/day) |
| **Reveal-return rate** | `daily_reveal_opened` | `daily_reveal_available` |
| **Gap view rate** | `gap_viewed` (distinct users per round) | `daily_reveal_opened` |
| **Next-day Daily return** | `next_daily_return` on D+1 OR `daily_started` on D+1 | `daily_completed` on D |

## Tables & events

- **`product_events`**: `event_type`, `user_id`, `marshmallow_id`, `payload` (jsonb), `created_at`
- **`entries`**: sealed play data; join via `marshmallow_id` → `daily_round_id`
- **`daily_rounds`**: `round_date`, `tension_id`
- **`scores` / CrowdSense**: unchanged official progression (not used for retention cohort)

## Payload expectations (beta events)

Events should carry **metadata only** — e.g. `round_id`, `position`, `line`, `legacy`, `gap_points`. Never choice labels, question text, or PII beyond existing `user_id`.

## Psychological loop measurement (internal)

Map existing events to the product loop — do not expose these labels in consumer UI:

| Loop stage | Event(s) |
|------------|----------|
| COMMIT | `daily_completed` |
| WONDER | `todays_read_viewed` |
| RETURN | `daily_reveal_opened` (after `daily_reveal_available`) |
| DISCOVER | `gap_viewed` |
| Next loop | `next_daily_return`, next-day `daily_started` / `daily_completed` |

**Core beta funnel:** daily completed → Today's Read viewed → leave → reveal opened later → Gap viewed → next Daily started/completed.

## Beta hypotheses (Beta 1)

**Primary:** Great questions + coherent tensions + immediate self-insight (Today's Read) + delayed social revelation will make players voluntarily return to discover whether they understood the room.

**Delay:** The delayed crowd reveal creates useful anticipation rather than merely frustration. Do not run instant-reveal A/B tests until after a delayed-reveal baseline with 50–100+ users.

## Example cohort query (sketch)

```sql
-- Users whose first daily_completed was on a given UTC date
WITH first_daily AS (
  SELECT user_id, min(created_at::date) AS d0
  FROM product_events
  WHERE event_type = 'daily_completed'
  GROUP BY user_id
)
SELECT d0, count(*) AS cohort_size
FROM first_daily
GROUP BY d0
ORDER BY d0 DESC;
```
