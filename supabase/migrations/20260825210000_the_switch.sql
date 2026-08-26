-- The Switch: optional post-pick circumstance prompt for Daily questions.
-- Original own_choice_id remains official for prediction / Accuracy.

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS switch_prompt text;

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS switch_original_choice_id uuid REFERENCES public.marshmallow_choices (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS switch_stayed boolean;

CREATE OR REPLACE FUNCTION public.save_switch_response(
  p_marshmallow_id uuid,
  p_switch_stayed boolean
) RETURNS public.entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_m public.marshmallows%ROWTYPE;
  v_entry public.entries%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;

  IF NULLIF(trim(v_m.switch_prompt), '') IS NULL THEN
    RAISE EXCEPTION 'switch_not_available';
  END IF;

  IF v_m.status IS DISTINCT FROM 'open' OR v_now >= v_m.closes_at OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_not_open';
  END IF;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id
  FOR UPDATE;

  IF v_entry.id IS NULL OR v_entry.own_choice_id IS NULL THEN
    RAISE EXCEPTION 'pick_required';
  END IF;

  IF v_entry.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'entry_sealed';
  END IF;

  IF v_entry.switch_stayed IS NOT NULL THEN
    RETURN v_entry;
  END IF;

  UPDATE public.entries
  SET switch_original_choice_id = v_entry.own_choice_id,
      switch_stayed = p_switch_stayed,
      draft_updated_at = v_now
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.save_switch_response(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_switch_response(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_entry_draft(
  p_marshmallow_id uuid,
  p_own_choice_id uuid,
  p_allocations jsonb DEFAULT NULL
) RETURNS public.entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_m public.marshmallows%ROWTYPE;
  v_entry public.entries%ROWTYPE;
  v_choice_marshmallow uuid;
  v_choice_count int;
  v_alloc_count int;
  v_alloc jsonb;
  v_choice_id uuid;
  v_pct int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;

  IF v_m.status IS DISTINCT FROM 'open' OR v_now >= v_m.closes_at OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_not_open';
  END IF;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id
  FOR UPDATE;

  IF v_entry.id IS NOT NULL AND v_entry.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'entry_sealed';
  END IF;

  IF v_entry.id IS NOT NULL
     AND v_entry.switch_stayed IS NOT NULL
     AND p_own_choice_id IS DISTINCT FROM v_entry.own_choice_id THEN
    RAISE EXCEPTION 'switch_locked';
  END IF;

  SELECT marshmallow_id INTO v_choice_marshmallow
  FROM public.marshmallow_choices
  WHERE id = p_own_choice_id;

  IF v_choice_marshmallow IS DISTINCT FROM p_marshmallow_id THEN
    RAISE EXCEPTION 'own_choice_mismatch';
  END IF;

  IF v_entry.id IS NULL THEN
    INSERT INTO public.entries (user_id, marshmallow_id, own_choice_id, draft_updated_at)
    VALUES (v_user_id, p_marshmallow_id, p_own_choice_id, v_now)
    RETURNING * INTO v_entry;
  ELSE
    UPDATE public.entries
    SET own_choice_id = p_own_choice_id,
        draft_updated_at = v_now
    WHERE id = v_entry.id
    RETURNING * INTO v_entry;
  END IF;

  IF p_allocations IS NULL THEN
    RETURN v_entry;
  END IF;

  IF jsonb_typeof(p_allocations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  SELECT count(*) INTO v_choice_count
  FROM public.marshmallow_choices
  WHERE marshmallow_id = p_marshmallow_id;

  SELECT count(DISTINCT (elem->>'choice_id'))::int
  INTO v_alloc_count
  FROM jsonb_array_elements(p_allocations) AS elem;

  IF v_alloc_count IS DISTINCT FROM v_choice_count THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) AS elem
    WHERE (elem->>'predicted_pct')::int < 0
       OR (elem->>'predicted_pct')::int > 100
       OR NOT EXISTS (
         SELECT 1 FROM public.marshmallow_choices c
         WHERE c.id = (elem->>'choice_id')::uuid
           AND c.marshmallow_id = p_marshmallow_id
       )
  ) THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  DELETE FROM public.entry_allocations WHERE entry_id = v_entry.id;

  FOR v_alloc IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    v_choice_id := (v_alloc->>'choice_id')::uuid;
    v_pct := (v_alloc->>'predicted_pct')::int;
    INSERT INTO public.entry_allocations (entry_id, choice_id, predicted_pct)
    VALUES (v_entry.id, v_choice_id, v_pct);
  END LOOP;

  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.seal_entry(
  p_marshmallow_id uuid,
  p_own_choice_id uuid,
  p_allocations jsonb,
  p_idempotency_key text DEFAULT NULL
) RETURNS public.entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_m public.marshmallows%ROWTYPE;
  v_entry public.entries%ROWTYPE;
  v_choice_marshmallow uuid;
  v_choice_count int;
  v_alloc_count int;
  v_sum int;
  v_alloc jsonb;
  v_choice_id uuid;
  v_pct int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_m
  FROM public.marshmallows
  WHERE id = p_marshmallow_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id
  FOR UPDATE;

  IF v_entry.id IS NOT NULL AND v_entry.sealed_at IS NOT NULL THEN
    RETURN v_entry;
  END IF;

  IF v_m.status IS DISTINCT FROM 'open' OR v_now >= v_m.closes_at THEN
    RAISE EXCEPTION 'marshmallow_not_open';
  END IF;

  IF NULLIF(trim(v_m.switch_prompt), '') IS NOT NULL THEN
    IF v_entry.switch_stayed IS NULL THEN
      RAISE EXCEPTION 'switch_required';
    END IF;
    IF v_entry.switch_original_choice_id IS DISTINCT FROM p_own_choice_id THEN
      RAISE EXCEPTION 'own_choice_protected';
    END IF;
  END IF;

  SELECT marshmallow_id INTO v_choice_marshmallow
  FROM public.marshmallow_choices
  WHERE id = p_own_choice_id;

  IF v_choice_marshmallow IS DISTINCT FROM p_marshmallow_id THEN
    RAISE EXCEPTION 'own_choice_mismatch';
  END IF;

  SELECT count(*) INTO v_choice_count
  FROM public.marshmallow_choices
  WHERE marshmallow_id = p_marshmallow_id;

  IF jsonb_typeof(p_allocations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  SELECT count(DISTINCT (elem->>'choice_id'))::int, coalesce(sum((elem->>'predicted_pct')::int), 0)::int
  INTO v_alloc_count, v_sum
  FROM jsonb_array_elements(p_allocations) AS elem;

  IF v_alloc_count IS DISTINCT FROM v_choice_count OR v_sum IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) AS elem
    WHERE (elem->>'predicted_pct')::int < 0
       OR (elem->>'predicted_pct')::int > 100
       OR NOT EXISTS (
         SELECT 1 FROM public.marshmallow_choices c
         WHERE c.id = (elem->>'choice_id')::uuid
           AND c.marshmallow_id = p_marshmallow_id
       )
  ) THEN
    RAISE EXCEPTION 'allocations_invalid';
  END IF;

  IF v_entry.id IS NULL THEN
    INSERT INTO public.entries (
      user_id, marshmallow_id, own_choice_id, idempotency_key, draft_updated_at
    ) VALUES (
      v_user_id, p_marshmallow_id, p_own_choice_id, p_idempotency_key, v_now
    )
    RETURNING * INTO v_entry;
  ELSE
    UPDATE public.entries
    SET own_choice_id = p_own_choice_id,
        idempotency_key = COALESCE(p_idempotency_key, idempotency_key),
        draft_updated_at = v_now
    WHERE id = v_entry.id
    RETURNING * INTO v_entry;
  END IF;

  DELETE FROM public.entry_allocations WHERE entry_id = v_entry.id;

  FOR v_alloc IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    v_choice_id := (v_alloc->>'choice_id')::uuid;
    v_pct := (v_alloc->>'predicted_pct')::int;
    INSERT INTO public.entry_allocations (entry_id, choice_id, predicted_pct)
    VALUES (v_entry.id, v_choice_id, v_pct);
  END LOOP;

  UPDATE public.entries
  SET sealed_at = v_now
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  PERFORM public.record_product_event(v_user_id, p_marshmallow_id, 'sealed', '{}'::jsonb);

  IF v_m.is_daily AND v_m.daily_on IS NOT NULL THEN
    PERFORM public.apply_daily_play_streak(v_user_id, v_m.daily_on);
  END IF;

  RETURN v_entry;
END;
$$;

-- Today's Daily Q4: forgiveness / cheating with The Switch
UPDATE public.marshmallows
SET switch_prompt = 'What if they only admitted it after being caught?'
WHERE id = '31000000-0000-4000-8000-000000000004';
