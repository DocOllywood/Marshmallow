-- Promote LOYALTY vs. JUSTICE (belief-bending experiment v1) to today's shared Daily.
-- Preserves previous public Daily, all IDs, choices, and historical entries.

BEGIN;

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000006';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000011';
  v_incumbent_id uuid := '40000000-0000-4000-8000-000000000002';
  v_incumbent_swap_date date := '2026-09-22';
  v_today date := (timezone('utc', now()))::date;
  v_component_count int;
  v_q4_requires_prediction boolean;
  v_sealed_count int;
  v_incumbent_sealed int;
  v_row record;
  v_closes_at timestamptz;
  v_reveals_at timestamptz;
BEGIN
  SELECT count(*)::int INTO v_component_count
  FROM public.marshmallows
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;

  IF v_component_count <> 5 THEN
    RAISE EXCEPTION 'loyalty_justice_component_count (expected=5, actual=%)', v_component_count;
  END IF;

  SELECT (m.metadata->'experiment'->>'requires_prediction')::boolean INTO v_q4_requires_prediction
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_round_id
    AND m.round_position = 4;

  IF v_q4_requires_prediction IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'loyalty_justice_q4_requires_prediction';
  END IF;

  SELECT count(*)::int INTO v_sealed_count
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE m.daily_round_id = v_round_id
    AND e.sealed_at IS NOT NULL;

  SELECT count(*)::int INTO v_incumbent_sealed
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE m.daily_round_id = v_incumbent_id
    AND e.sealed_at IS NOT NULL;

  RAISE NOTICE 'loyalty_justice_preflight sealed_entries=% incumbent_sealed=% utc_today=%',
    v_sealed_count, v_incumbent_sealed, v_today;

  IF EXISTS (
    SELECT 1
    FROM public.daily_rounds
    WHERE round_date = v_today
      AND id <> v_incumbent_id
      AND id <> v_round_id
  ) THEN
    RAISE EXCEPTION 'unexpected_round_on_today';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.daily_rounds WHERE id = v_incumbent_id AND round_date = v_today
  ) THEN
    RAISE EXCEPTION 'incumbent_not_on_today (id=%)', v_incumbent_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_rounds
    WHERE round_date = v_incumbent_swap_date
      AND id NOT IN (v_round_id, v_incumbent_id)
  ) THEN
    RAISE EXCEPTION 'incumbent_swap_date_taken (date=%)', v_incumbent_swap_date;
  END IF;

  SELECT dr.id, dr.round_date, dr.status, dr.title, dr.tension_id, dr.metadata, ht.display_label
  INTO v_row
  FROM public.daily_rounds dr
  LEFT JOIN public.human_tensions ht ON ht.id = dr.tension_id
  WHERE dr.id = v_round_id;

  IF v_row.title IS DISTINCT FROM 'How much does loyalty excuse?' THEN
    RAISE EXCEPTION 'loyalty_justice_title_mismatch (title=%)', v_row.title;
  END IF;

  IF v_row.tension_id IS DISTINCT FROM v_tension_id
     OR v_row.display_label IS DISTINCT FROM 'LOYALTY vs. JUSTICE' THEN
    RAISE EXCEPTION 'loyalty_justice_tension_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'version')::int IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'loyalty_justice_experiment_version';
  END IF;

  -- Swap round_date via temp slot to satisfy daily_rounds_one_per_utc_date.
  UPDATE public.daily_rounds
  SET round_date = '2099-01-01', updated_at = now()
  WHERE id = v_round_id;

  UPDATE public.daily_rounds
  SET
    round_date = v_incumbent_swap_date,
    status = 'draft',
    updated_at = now()
  WHERE id = v_incumbent_id;

  UPDATE public.marshmallows
  SET daily_on = v_incumbent_swap_date, updated_at = now()
  WHERE daily_round_id = v_incumbent_id;

  UPDATE public.daily_rounds
  SET
    round_date = v_today,
    status = 'open',
    updated_at = now()
  WHERE id = v_round_id;

  UPDATE public.marshmallows
  SET daily_on = v_today, updated_at = now()
  WHERE daily_round_id = v_round_id;

  v_closes_at := v_today::timestamptz + interval '22 hours';
  v_reveals_at := v_today::timestamptz + interval '25 hours';

  IF v_closes_at <= now() THEN
    v_closes_at := now() + interval '30 minutes';
  END IF;

  IF v_reveals_at <= v_closes_at THEN
    v_reveals_at := v_closes_at + interval '1 hour';
  END IF;

  RAISE NOTICE 'loyalty_justice_target closes_at=% reveals_at=%', v_closes_at, v_reveals_at;

  UPDATE public.marshmallows
  SET
    status = 'open',
    expires_at = NULL,
    opens_at = least(opens_at, now() - interval '1 hour'),
    closes_at = v_closes_at,
    reveals_at = v_reveals_at,
    hard_reveals_at = v_reveals_at,
    updated_at = now()
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;
END $$;

COMMIT;
