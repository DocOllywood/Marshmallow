-- Open Part 13 HONESTY vs. KINDNESS test round for direct-URL internal QA only.
-- Does NOT promote the round to today's home Daily (round_date stays UTC today+3, status draft).

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000004';
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
    RETURN;
  END IF;

  UPDATE public.marshmallows
  SET
    status = 'open',
    expires_at = NULL,
    opens_at = v_now - interval '1 hour',
    closes_at = v_now + interval '48 hours',
    reveals_at = v_now + interval '49 hours',
    hard_reveals_at = v_now + interval '49 hours'
  WHERE daily_round_id = v_round_id
    AND status IN ('draft', 'scheduled', 'open', 'closed');
END $$;
