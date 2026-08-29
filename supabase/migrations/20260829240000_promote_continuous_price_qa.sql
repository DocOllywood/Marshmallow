-- Promote Price QA round 008 into always-available continuous inventory.
-- Forward-only: does not touch Day 1 (009), Money Week Days 2–7, Dares, or scoring/reveal rules.

BEGIN;

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000008';
  v_day1_id uuid := '40000000-0000-4000-8000-000000000009';
  v_principle_id uuid := '60000000-0000-4000-8000-000000000002';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000008';
  v_inventory_date date := '2099-12-31';
  v_opens_at timestamptz := '2026-08-29T00:00:00Z';
  v_closes_at timestamptz := '2099-12-31T23:59:59Z';
  v_reveals_at timestamptz := '2099-12-31T23:59:59Z';
  v_hard_reveals_at timestamptz := v_reveals_at;
  v_component_count int;
  v_q4_requires_prediction boolean;
  v_q5_is_line boolean;
  v_row record;
  v_day1 record;
  v_day2 record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
    RAISE EXCEPTION 'continuous_price_qa_round_missing';
  END IF;

  SELECT dr.id, dr.round_date, dr.status, dr.title, dr.subtitle, dr.tension_id, dr.principle_id, dr.metadata
  INTO v_row
  FROM public.daily_rounds dr
  WHERE dr.id = v_round_id;

  IF v_row.title IS DISTINCT FROM 'Would you sell what you promised to keep?' THEN
    RAISE EXCEPTION 'continuous_price_qa_title_mismatch (title=%)', v_row.title;
  END IF;

  IF v_row.tension_id IS DISTINCT FROM v_tension_id THEN
    RAISE EXCEPTION 'continuous_price_qa_tension_mismatch';
  END IF;

  IF v_row.principle_id IS DISTINCT FROM v_principle_id THEN
    RAISE EXCEPTION 'continuous_price_qa_principle_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'archetype') IS DISTINCT FROM 'price' THEN
    RAISE EXCEPTION 'continuous_price_qa_archetype_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'version')::int IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'continuous_price_qa_experiment_version';
  END IF;

  SELECT count(*)::int INTO v_component_count
  FROM public.marshmallows
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;

  IF v_component_count <> 5 THEN
    RAISE EXCEPTION 'continuous_price_qa_component_count (expected=5, actual=%)', v_component_count;
  END IF;

  SELECT (m.metadata->'experiment'->>'requires_prediction')::boolean INTO v_q4_requires_prediction
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_round_id
    AND m.round_position = 4;

  IF v_q4_requires_prediction IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'continuous_price_qa_q4_requires_prediction';
  END IF;

  SELECT m.is_line INTO v_q5_is_line
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_round_id
    AND m.round_position = 5;

  IF v_q5_is_line IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'continuous_price_qa_q5_not_line';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_day1_id) THEN
    RAISE EXCEPTION 'continuous_price_qa_day1_missing';
  END IF;

  SELECT dr.id, dr.round_date, dr.status
  INTO v_day1
  FROM public.daily_rounds dr
  WHERE dr.id = v_day1_id;

  IF v_day1.status IS DISTINCT FROM 'scheduled' THEN
    RAISE EXCEPTION 'continuous_price_qa_day1_status_changed (status=%)', v_day1.status;
  END IF;

  IF v_day1.round_date IS DISTINCT FROM DATE '2026-09-02' THEN
    RAISE EXCEPTION 'continuous_price_qa_day1_date_changed (date=%)', v_day1.round_date;
  END IF;

  FOR v_day2 IN
    SELECT id, round_date, status, title
    FROM public.daily_rounds
    WHERE id IN (
      '40000000-0000-4000-8000-000000000010',
      '40000000-0000-4000-8000-000000000011',
      '40000000-0000-4000-8000-000000000012',
      '40000000-0000-4000-8000-000000000013',
      '40000000-0000-4000-8000-000000000014',
      '40000000-0000-4000-8000-000000000015'
    )
    ORDER BY id
  LOOP
    IF v_day2.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'continuous_price_qa_money_week_not_draft (id=%, status=%)', v_day2.id, v_day2.status;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.daily_rounds
    WHERE round_date = v_inventory_date
      AND id <> v_round_id
  ) THEN
    RAISE EXCEPTION 'continuous_price_qa_inventory_date_taken (date=%)', v_inventory_date;
  END IF;

  RAISE NOTICE 'continuous_price_qa_preflight round=% opens=% closes=% reveals=% inventory_date=%',
    v_round_id, v_opens_at, v_closes_at, v_reveals_at, v_inventory_date;

  UPDATE public.daily_rounds
  SET
    round_date = v_inventory_date,
    status = 'open',
    updated_at = now()
  WHERE id = v_round_id;

  UPDATE public.marshmallows
  SET
    daily_on = v_inventory_date,
    status = 'open',
    expires_at = NULL,
    opens_at = v_opens_at,
    closes_at = v_closes_at,
    reveals_at = v_reveals_at,
    hard_reveals_at = v_hard_reveals_at,
    updated_at = now()
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;
END $$;

COMMIT;
