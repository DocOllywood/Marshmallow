-- Reveal return metrics, concurrent open_reveal safety, analytics allowlist.

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

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'score_not_ready';
  END IF;

  v_in_window := v_now < (v_m.reveals_at + interval '24 hours');
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
      v_in_window AND v_m.is_daily AND v_m.daily_on IS NOT NULL
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

REVOKE ALL ON FUNCTION public.open_reveal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_reveal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_reveal_return_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eligible int;
  v_opens int;
  v_bonus int;
  v_median numeric;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*)::int INTO v_eligible
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE e.sealed_at IS NOT NULL
    AND m.status = 'revealed'
    AND m.cancelled_at IS NULL;

  SELECT count(*)::int INTO v_opens
  FROM public.reveal_opens ro
  JOIN public.entries e
    ON e.user_id = ro.user_id AND e.marshmallow_id = ro.marshmallow_id
  JOIN public.marshmallows m ON m.id = ro.marshmallow_id
  WHERE e.sealed_at IS NOT NULL
    AND m.status = 'revealed'
    AND m.cancelled_at IS NULL;

  SELECT count(*)::int INTO v_bonus
  FROM public.reveal_opens ro
  JOIN public.entries e
    ON e.user_id = ro.user_id AND e.marshmallow_id = ro.marshmallow_id
  JOIN public.marshmallows m ON m.id = ro.marshmallow_id
  WHERE e.sealed_at IS NOT NULL
    AND m.status = 'revealed'
    AND m.cancelled_at IS NULL
    AND ro.reveal_bonus_earned;

  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (ro.opened_at - m.reveals_at))
  )
  INTO v_median
  FROM public.reveal_opens ro
  JOIN public.entries e
    ON e.user_id = ro.user_id AND e.marshmallow_id = ro.marshmallow_id
  JOIN public.marshmallows m ON m.id = ro.marshmallow_id
  WHERE e.sealed_at IS NOT NULL
    AND m.status = 'revealed'
    AND m.cancelled_at IS NULL;

  RETURN jsonb_build_object(
    'eligible_sealed_reveals', v_eligible,
    'first_reveal_opens', v_opens,
    'rrr', CASE WHEN v_eligible = 0 THEN NULL ELSE round(v_opens::numeric / v_eligible, 4) END,
    'bonus_qualified', v_bonus,
    'bonus_rate', CASE WHEN v_eligible = 0 THEN NULL ELSE round(v_bonus::numeric / v_eligible, 4) END,
    'median_open_seconds', v_median
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_reveal_return_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reveal_return_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.track_product_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_marshmallow_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_event_type NOT IN (
    'onboarding_started',
    'onboarding_category_selected',
    'onboarding_topic_selected',
    'onboarding_completed',
    'home_viewed',
    'sealed',
    'reveal_opened',
    'reveal_bonus_earned',
    'shared',
    'marshmallow_viewed',
    'answer_selected',
    'prediction_started',
    'prediction_changed',
    'prediction_sealed',
    'waiting_viewed',
    'waiting_returned',
    'reveal_ready',
    'reveal_completed',
    'next_marshmallow_clicked'
  ) THEN
    RAISE EXCEPTION 'event_type_invalid';
  END IF;

  INSERT INTO public.product_events (user_id, marshmallow_id, event_type, payload)
  VALUES (
    v_user_id,
    p_marshmallow_id,
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.track_product_event(text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_product_event(text, jsonb, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_daily_reveal_streak(p_user_id uuid, p_daily_on date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.streaks%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.streaks WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.streaks (user_id) VALUES (p_user_id);
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
    SELECT * INTO v_row FROM public.streaks WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF v_row.reveal_last_qualifying_on IS NOT DISTINCT FROM p_daily_on THEN
    RETURN;
  END IF;

  IF v_row.reveal_last_qualifying_on IS NOT NULL
     AND p_daily_on = v_row.reveal_last_qualifying_on + 1 THEN
    v_row.reveal_current := v_row.reveal_current + 1;
  ELSE
    v_row.reveal_current := 1;
  END IF;

  v_row.reveal_longest := GREATEST(v_row.reveal_longest, v_row.reveal_current);
  v_row.reveal_last_qualifying_on := p_daily_on;

  UPDATE public.streaks SET
    reveal_current = v_row.reveal_current,
    reveal_longest = v_row.reveal_longest,
    reveal_last_qualifying_on = v_row.reveal_last_qualifying_on
  WHERE user_id = p_user_id;
END;
$$;
