-- The Line: threshold-style Daily question with discrete choices (behavioral, not scored).

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS is_line boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.seal_line_entry(
  p_marshmallow_id uuid,
  p_own_choice_id uuid,
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

  IF NOT v_m.is_line THEN
    RAISE EXCEPTION 'not_a_line_question';
  END IF;

  IF v_m.status IS DISTINCT FROM 'open' OR v_now >= v_m.closes_at OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_not_open';
  END IF;

  SELECT marshmallow_id INTO v_choice_marshmallow
  FROM public.marshmallow_choices
  WHERE id = p_own_choice_id;

  IF v_choice_marshmallow IS DISTINCT FROM p_marshmallow_id THEN
    RAISE EXCEPTION 'own_choice_mismatch';
  END IF;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id
  FOR UPDATE;

  IF v_entry.id IS NOT NULL AND v_entry.sealed_at IS NOT NULL THEN
    RETURN v_entry;
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

  UPDATE public.entries
  SET sealed_at = v_now
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  PERFORM public.record_product_event(v_user_id, p_marshmallow_id, 'sealed', '{"line":true}'::jsonb);

  IF v_m.is_daily AND v_m.daily_on IS NOT NULL THEN
    PERFORM public.apply_daily_play_streak(v_user_id, v_m.daily_on);
  END IF;

  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.seal_line_entry(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seal_line_entry(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_marshmallow(p_marshmallow_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.marshmallows%ROWTYPE;
  v_total int;
  v_choice record;
  v_entry record;
  v_brier numeric;
  v_accuracy int;
  v_now timestamptz := now();
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_m
  FROM public.marshmallows
  WHERE id = p_marshmallow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;

  IF v_m.status = 'cancelled' OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_cancelled';
  END IF;

  IF v_m.status = 'revealed' AND EXISTS (
    SELECT 1 FROM public.marshmallow_results WHERE marshmallow_id = p_marshmallow_id
  ) THEN
    IF v_m.result_available_at IS NULL THEN
      UPDATE public.marshmallows
      SET result_available_at = v_now
      WHERE id = p_marshmallow_id;
    END IF;
    RETURN;
  END IF;

  IF NOT public.ready_to_finalize(p_marshmallow_id) THEN
    RAISE EXCEPTION 'marshmallow_not_ready_to_reveal';
  END IF;

  SELECT count(*)::int INTO v_total
  FROM public.entries
  WHERE marshmallow_id = p_marshmallow_id AND sealed_at IS NOT NULL;

  INSERT INTO public.marshmallow_results (marshmallow_id, total_sealed_votes, computed_at)
  VALUES (p_marshmallow_id, v_total, v_now)
  ON CONFLICT (marshmallow_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.marshmallow_result_choices WHERE marshmallow_id = p_marshmallow_id
  ) THEN
    FOR v_choice IN
      SELECT c.id,
             coalesce(count(e.id) FILTER (WHERE e.sealed_at IS NOT NULL), 0)::int AS votes
      FROM public.marshmallow_choices c
      LEFT JOIN public.entries e
        ON e.own_choice_id = c.id AND e.marshmallow_id = c.marshmallow_id
      WHERE c.marshmallow_id = p_marshmallow_id
      GROUP BY c.id, c.sort_order
      ORDER BY c.sort_order
    LOOP
      INSERT INTO public.marshmallow_result_choices (
        marshmallow_id, choice_id, vote_count, vote_pct
      ) VALUES (
        p_marshmallow_id,
        v_choice.id,
        v_choice.votes,
        CASE WHEN v_total = 0 THEN 0 ELSE round((v_choice.votes::numeric / v_total) * 100, 2) END
      );
    END LOOP;
  END IF;

  IF NOT v_m.is_line THEN
    FOR v_entry IN
      SELECT e.user_id, e.id
      FROM public.entries e
      WHERE e.marshmallow_id = p_marshmallow_id AND e.sealed_at IS NOT NULL
    LOOP
      SELECT coalesce(sum(power((a.predicted_pct::numeric / 100) - (rc.vote_pct / 100), 2)), 0)
      INTO v_brier
      FROM public.entry_allocations a
      JOIN public.marshmallow_result_choices rc
        ON rc.choice_id = a.choice_id AND rc.marshmallow_id = p_marshmallow_id
      WHERE a.entry_id = v_entry.id;

      v_accuracy := round(100 * (1 - v_brier / 2));
      INSERT INTO public.scores (user_id, marshmallow_id, accuracy, base_points, calculated_at)
      VALUES (v_entry.user_id, p_marshmallow_id, v_accuracy, v_accuracy, v_now)
      ON CONFLICT (user_id, marshmallow_id) DO NOTHING;

      PERFORM public.rebuild_crowdsense(v_entry.user_id);
    END LOOP;
  END IF;

  UPDATE public.marshmallows
  SET status = 'revealed',
      result_available_at = coalesce(result_available_at, v_now)
  WHERE id = p_marshmallow_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_reveal(p_marshmallow_id uuid)
RETURNS public.reveal_opens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_m public.marshmallows%ROWTYPE;
  v_score public.scores%ROWTYPE;
  v_open public.reveal_opens%ROWTYPE;
  v_bonus int;
  v_in_window boolean;
  v_daily boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_open
  FROM public.reveal_opens
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;

  IF FOUND THEN
    RETURN v_open;
  END IF;

  IF NOT public.is_revealed(p_marshmallow_id) THEN
    RAISE EXCEPTION 'results_not_available';
  END IF;

  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id FOR SHARE;
  IF v_m.status = 'cancelled' OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_cancelled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entries
    WHERE user_id = v_user_id
      AND marshmallow_id = p_marshmallow_id
      AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'no_sealed_entry';
  END IF;

  v_daily := v_m.is_daily AND v_m.daily_on IS NOT NULL AND v_m.play_mode = 'daily';
  v_in_window := v_daily AND v_now < (v_m.reveals_at + interval '24 hours');

  IF v_m.is_line THEN
    INSERT INTO public.reveal_opens (
      user_id,
      marshmallow_id,
      opened_at,
      base_points,
      reveal_bonus_points,
      reveal_bonus_earned,
      reveal_streak_qualified
    ) VALUES (
      v_user_id,
      p_marshmallow_id,
      v_now,
      0,
      0,
      false,
      false
    )
    RETURNING * INTO v_open;

    PERFORM public.record_product_event(v_user_id, p_marshmallow_id, 'reveal_opened', '{"line":true}'::jsonb);
    RETURN v_open;
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'score_not_ready';
  END IF;

  v_bonus := CASE WHEN v_in_window THEN public.reveal_bonus_points(v_score.base_points) ELSE 0 END;

  BEGIN
    INSERT INTO public.reveal_opens (
      user_id,
      marshmallow_id,
      opened_at,
      base_points,
      reveal_bonus_points,
      reveal_bonus_earned,
      reveal_streak_qualified
    ) VALUES (
      v_user_id,
      p_marshmallow_id,
      v_now,
      v_score.base_points,
      v_bonus,
      v_in_window AND v_bonus > 0,
      v_in_window
    )
    RETURNING * INTO v_open;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_open
    FROM public.reveal_opens
    WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;
    RETURN v_open;
  END;

  PERFORM public.record_product_event(v_user_id, p_marshmallow_id, 'reveal_opened', '{}'::jsonb);
  IF v_open.reveal_bonus_earned THEN
    PERFORM public.record_product_event(
      v_user_id,
      p_marshmallow_id,
      'reveal_bonus_earned',
      jsonb_build_object('reveal_bonus_points', v_open.reveal_bonus_points)
    );
  END IF;

  IF v_open.reveal_streak_qualified THEN
    PERFORM public.apply_daily_reveal_streak(v_user_id, v_m.daily_on);
  END IF;

  RETURN v_open;
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

  IF v_m.is_line THEN
    RAISE EXCEPTION 'not_a_line_question';
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

-- Today's Daily Q5 becomes The Line (only when no sealed history yet).
DO $$
DECLARE
  v_q5 uuid := '31000000-0000-4000-8000-000000000005';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.entries
    WHERE marshmallow_id = v_q5 AND sealed_at IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = v_q5;

  UPDATE public.marshmallows
  SET
    question = 'How long could your closest friend hide a major secret before you''d consider it a betrayal?',
    is_line = true
  WHERE id = v_q5;

  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
    ('31000000-0000-4000-8000-000000000051', v_q5, 'Immediately', 0),
    ('31000000-0000-4000-8000-000000000052', v_q5, 'A week', 1),
    ('31000000-0000-4000-8000-000000000053', v_q5, 'A month', 2),
    ('31000000-0000-4000-8000-000000000054', v_q5, 'A year', 3),
    ('31000000-0000-4000-8000-000000000055', v_q5, 'Never', 4);
END $$;
