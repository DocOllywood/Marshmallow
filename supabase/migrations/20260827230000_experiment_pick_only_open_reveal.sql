-- Experiment pick-only stages (Q1–Q3) have no scores; allow reveal opens like Line.

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
  v_requires_prediction boolean;
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
  v_requires_prediction := public.marshmallow_requires_prediction(v_m.metadata);

  IF v_m.is_line OR NOT v_requires_prediction THEN
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

    PERFORM public.record_product_event(
      v_user_id,
      p_marshmallow_id,
      'reveal_opened',
      CASE WHEN v_m.is_line THEN '{"line":true}'::jsonb ELSE '{"pick_only":true}'::jsonb END
    );
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
