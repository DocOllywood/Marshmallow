-- Beta 1: same-day evening reveal window for promoted Part 13 Daily only.
-- Preflight checks; does not touch legacy round, entries, or IDs.

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000004';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000001';
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_component_count int;
  v_sealed_count int;
  v_closes_at timestamptz;
  v_reveals_at timestamptz;
  v_row record;
BEGIN
  SELECT dr.id, dr.round_date, dr.status, dr.title, dr.tension_id, ht.display_label
  INTO v_row
  FROM public.daily_rounds dr
  LEFT JOIN public.human_tensions ht ON ht.id = dr.tension_id
  WHERE dr.id = v_round_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'part13_round_missing';
  END IF;

  IF v_row.round_date IS DISTINCT FROM v_today THEN
    RAISE EXCEPTION 'part13_not_todays_daily (round_date=%, utc_today=%)', v_row.round_date, v_today;
  END IF;

  IF v_row.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'part13_not_open (status=%)', v_row.status;
  END IF;

  IF v_row.tension_id IS DISTINCT FROM v_tension_id
     OR v_row.display_label IS DISTINCT FROM 'HONESTY vs. KINDNESS' THEN
    RAISE EXCEPTION 'part13_tension_mismatch (tension_id=%, label=%)', v_row.tension_id, v_row.display_label;
  END IF;

  IF v_row.title IS DISTINCT FROM 'When does honesty become cruelty?' THEN
    RAISE EXCEPTION 'part13_title_mismatch (title=%)', v_row.title;
  END IF;

  SELECT count(*)::int INTO v_component_count
  FROM public.marshmallows
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;

  IF v_component_count <> 5 THEN
    RAISE EXCEPTION 'part13_component_count (expected=5, actual=%)', v_component_count;
  END IF;

  SELECT count(*)::int INTO v_sealed_count
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE m.daily_round_id = v_round_id
    AND e.sealed_at IS NOT NULL;

  RAISE NOTICE 'part13_preflight sealed_entries=%', v_sealed_count;

  FOR v_row IN
    SELECT id, round_position, status, closes_at, reveals_at, hard_reveals_at, minimum_result_sample
    FROM public.marshmallows
    WHERE daily_round_id = v_round_id
    ORDER BY round_position
  LOOP
    RAISE NOTICE 'part13_preflight q% id=% status=% closes=% reveals=% hard=% min_sample=%',
      v_row.round_position, v_row.id, v_row.status, v_row.closes_at, v_row.reveals_at,
      v_row.hard_reveals_at, v_row.minimum_result_sample;
  END LOOP;

  -- Same UTC calendar day: close at 22:00 UTC (~6 PM EDT), reveal at 01:00 UTC next day (~9 PM EDT).
  v_closes_at := v_today::timestamptz + interval '22 hours';
  v_reveals_at := v_today::timestamptz + interval '25 hours';

  IF v_closes_at <= now() THEN
    v_closes_at := now() + interval '30 minutes';
  END IF;

  IF v_reveals_at <= v_closes_at THEN
    v_reveals_at := v_closes_at + interval '1 hour';
  END IF;

  RAISE NOTICE 'part13_target closes_at=% reveals_at=% hard_reveals_at=%',
    v_closes_at, v_reveals_at, v_reveals_at;

  UPDATE public.marshmallows
  SET
    closes_at = v_closes_at,
    reveals_at = v_reveals_at,
    hard_reveals_at = v_reveals_at,
    updated_at = now()
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;
END $$;
