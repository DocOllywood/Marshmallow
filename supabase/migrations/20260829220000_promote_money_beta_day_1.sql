-- Promote Money Beta Day 1 only (partner dream job).
-- Days 2–7 remain draft on QA dates. Forward-only; does not rewrite prior migrations.

BEGIN;

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000009';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000007';
  v_principle_id uuid := '60000000-0000-4000-8000-000000000003';
  v_target_date date := '2026-09-02';
  v_opens_at timestamptz := '2026-09-02T12:00:00Z';
  v_closes_at timestamptz := '2026-09-03T01:00:00Z';
  v_reveals_at timestamptz := '2026-09-03T03:30:00Z';
  v_hard_reveals_at timestamptz := v_reveals_at;
  v_component_count int;
  v_q4_requires_prediction boolean;
  v_q5_is_line boolean;
  v_sealed_count int;
  v_row record;
  v_day2 record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
    RAISE EXCEPTION 'money_beta_day1_round_missing';
  END IF;

  SELECT dr.id, dr.round_date, dr.status, dr.title, dr.tension_id, dr.principle_id, dr.metadata,
         ht.display_label
  INTO v_row
  FROM public.daily_rounds dr
  LEFT JOIN public.human_tensions ht ON ht.id = dr.tension_id
  WHERE dr.id = v_round_id;

  IF v_row.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'money_beta_day1_not_draft (status=%)', v_row.status;
  END IF;

  IF v_row.title IS DISTINCT FROM 'Would you move for their dream job?' THEN
    RAISE EXCEPTION 'money_beta_day1_title_mismatch (title=%)', v_row.title;
  END IF;

  IF v_row.tension_id IS DISTINCT FROM v_tension_id
     OR v_row.display_label IS DISTINCT FROM 'BELONGING vs. INDEPENDENCE' THEN
    RAISE EXCEPTION 'money_beta_day1_tension_mismatch';
  END IF;

  IF v_row.principle_id IS DISTINCT FROM v_principle_id THEN
    RAISE EXCEPTION 'money_beta_day1_principle_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'archetype') IS DISTINCT FROM 'price' THEN
    RAISE EXCEPTION 'money_beta_day1_archetype_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'price_reference_side') IS DISTINCT FROM 'left' THEN
    RAISE EXCEPTION 'money_beta_day1_price_reference_side_mismatch';
  END IF;

  IF (v_row.metadata->'experiment'->>'version')::int IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'money_beta_day1_experiment_version';
  END IF;

  SELECT count(*)::int INTO v_component_count
  FROM public.marshmallows
  WHERE daily_round_id = v_round_id
    AND round_position BETWEEN 1 AND 5;

  IF v_component_count <> 5 THEN
    RAISE EXCEPTION 'money_beta_day1_component_count (expected=5, actual=%)', v_component_count;
  END IF;

  SELECT (m.metadata->'experiment'->>'requires_prediction')::boolean INTO v_q4_requires_prediction
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_round_id
    AND m.round_position = 4;

  IF v_q4_requires_prediction IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'money_beta_day1_q4_requires_prediction';
  END IF;

  SELECT m.is_line INTO v_q5_is_line
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_round_id
    AND m.round_position = 5;

  IF v_q5_is_line IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'money_beta_day1_q5_not_line';
  END IF;

  SELECT count(*)::int INTO v_sealed_count
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE m.daily_round_id = v_round_id
    AND e.sealed_at IS NOT NULL;

  IF v_sealed_count > 0 THEN
    RAISE EXCEPTION 'money_beta_day1_unexpected_sealed_entries (count=%)', v_sealed_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.daily_rounds
    WHERE round_date = v_target_date
      AND id <> v_round_id
  ) THEN
    RAISE EXCEPTION 'money_beta_day1_target_date_taken (date=%)', v_target_date;
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
      RAISE EXCEPTION 'money_week_day_not_draft (id=%, status=%)', v_day2.id, v_day2.status;
    END IF;
  END LOOP;

  RAISE NOTICE 'money_beta_day1_preflight sealed_entries=% target_date=% opens=% closes=% reveals=%',
    v_sealed_count, v_target_date, v_opens_at, v_closes_at, v_reveals_at;

  UPDATE public.daily_rounds
  SET
    round_date = v_target_date,
    status = 'scheduled',
    updated_at = now()
  WHERE id = v_round_id;

  UPDATE public.marshmallows
  SET
    daily_on = v_target_date,
    status = 'scheduled',
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
