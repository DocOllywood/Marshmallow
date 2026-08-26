-- Promote Part 13 HONESTY vs. KINDNESS round to today's shared Daily (QA).
-- Preserves legacy round, marshmallow IDs, choice IDs, and all entries.

BEGIN;

UPDATE public.daily_rounds
SET
  round_date = '2026-08-25',
  status = 'draft',
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000001';

UPDATE public.daily_rounds
SET
  round_date = '2026-08-26',
  status = 'open',
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000004';

UPDATE public.marshmallows
SET daily_on = '2026-08-26'
WHERE daily_round_id = '40000000-0000-4000-8000-000000000004';

COMMIT;
