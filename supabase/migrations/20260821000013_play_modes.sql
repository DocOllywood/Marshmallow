-- Quick / Live / Daily play modes on the existing lifecycle.
-- Daily uniqueness, timestamps, and result secrecy stay authoritative.
-- Quick skips reveal-ready inbox. Reveal Bonus + Reveal Streak stay Daily-only.

CREATE TYPE public.play_mode AS ENUM ('quick', 'live', 'daily');

ALTER TABLE public.marshmallows
  ADD COLUMN play_mode public.play_mode;

UPDATE public.marshmallows
SET play_mode = CASE
  WHEN is_daily THEN 'daily'::public.play_mode
  ELSE 'live'::public.play_mode
END
WHERE play_mode IS NULL;

ALTER TABLE public.marshmallows
  ALTER COLUMN play_mode SET NOT NULL,
  ALTER COLUMN play_mode SET DEFAULT 'live';

ALTER TABLE public.marshmallows
  ADD CONSTRAINT marshmallows_play_mode_daily_ck CHECK (
    (play_mode = 'daily' AND is_daily AND daily_on IS NOT NULL)
    OR (play_mode IN ('quick', 'live') AND NOT is_daily AND daily_on IS NULL)
  );

CREATE INDEX marshmallows_play_mode_status_idx
  ON public.marshmallows (play_mode, status, reveals_at DESC);

CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('loved', 'okay', 'confusing')),
  comment text,
  context text NOT NULL CHECK (context IN ('quick_reveal', 'live_reveal', 'daily_reveal', 'settings')),
  marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.beta_feedback TO authenticated;
CREATE POLICY beta_feedback_insert_own
  ON public.beta_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY beta_feedback_select_own_or_admin
  ON public.beta_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.enqueue_reveal_ready_notifications(p_marshmallow_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.marshmallows%ROWTYPE;
  v_votes int := 0;
  v_inserted int := 0;
BEGIN
  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_m.status IS DISTINCT FROM 'revealed' OR v_m.cancelled_at IS NOT NULL THEN
    RETURN 0;
  END IF;
  IF NOT public.is_revealed(p_marshmallow_id) THEN
    RETURN 0;
  END IF;
  -- Quick: in-app READY shelf is enough. No inbox, no email outbox.
  IF v_m.play_mode = 'quick' THEN
    RETURN 0;
  END IF;

  SELECT coalesce(total_sealed_votes, 0) INTO v_votes
  FROM public.marshmallow_results
  WHERE marshmallow_id = p_marshmallow_id;

  IF v_votes <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, marshmallow_id, payload)
  SELECT
    e.user_id,
    'reveal_ready',
    p_marshmallow_id,
    jsonb_build_object('href', '/m/' || p_marshmallow_id::text || '?from=notify')
  FROM public.entries e
  WHERE e.marshmallow_id = p_marshmallow_id
    AND e.sealed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.reveal_opens ro
      WHERE ro.user_id = e.user_id AND ro.marshmallow_id = p_marshmallow_id
    )
  ON CONFLICT (user_id, marshmallow_id) WHERE type = 'reveal_ready' DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO public.email_outbox (user_id, marshmallow_id, notification_id, template)
  SELECT n.user_id, n.marshmallow_id, n.id, 'reveal_ready'
  FROM public.notifications n
  JOIN public.notification_prefs p ON p.user_id = n.user_id
  WHERE n.marshmallow_id = p_marshmallow_id
    AND n.type = 'reveal_ready'
    AND p.email_reveal_ready
  ON CONFLICT (user_id, marshmallow_id, template) DO NOTHING;

  RETURN v_inserted;
END;
$$;

-- Daily-only Reveal Bonus. Streak was already Daily-only.
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

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'score_not_ready';
  END IF;

  v_daily := v_m.is_daily AND v_m.daily_on IS NOT NULL AND v_m.play_mode = 'daily';
  v_in_window := v_daily AND v_now < (v_m.reveals_at + interval '24 hours');
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

DROP FUNCTION IF EXISTS public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.admin_upsert_marshmallow(
  p_question text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_reveals_at timestamptz,
  p_choices jsonb,
  p_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_is_daily boolean DEFAULT false,
  p_play_mode public.play_mode DEFAULT NULL
) RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid;
  v_row public.marshmallows%ROWTYPE;
  v_daily_on date;
  v_choice jsonb;
  v_labels text[];
  v_label text;
  v_order int := 0;
  v_action text;
  v_mode public.play_mode;
  v_is_daily boolean;
BEGIN
  v_admin := public.assert_admin();

  IF char_length(trim(p_question)) < 8 OR char_length(trim(p_question)) > 280 THEN
    RAISE EXCEPTION 'question_invalid';
  END IF;

  IF p_opens_at >= p_closes_at OR p_closes_at >= p_reveals_at THEN
    RAISE EXCEPTION 'timestamps_invalid';
  END IF;

  IF p_topic_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.topics WHERE id = p_topic_id AND active
  ) THEN
    RAISE EXCEPTION 'topic_invalid';
  END IF;

  IF jsonb_typeof(p_choices) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'choices_invalid';
  END IF;

  IF jsonb_array_length(p_choices) > 4 THEN
    RAISE EXCEPTION 'choices_invalid';
  END IF;

  v_labels := ARRAY[]::text[];
  FOR v_choice IN SELECT value FROM jsonb_array_elements(p_choices)
  LOOP
    v_label := lower(trim(v_choice->>'label'));
    IF v_label IS NULL OR v_label = '' OR char_length(trim(v_choice->>'label')) > 80 THEN
      RAISE EXCEPTION 'choices_invalid';
    END IF;
    IF v_label = ANY (v_labels) THEN
      RAISE EXCEPTION 'choices_duplicate';
    END IF;
    v_labels := v_labels || v_label;
  END LOOP;

  v_mode := coalesce(
    p_play_mode,
    CASE WHEN p_is_daily THEN 'daily'::public.play_mode ELSE 'live'::public.play_mode END
  );
  IF v_mode = 'daily' THEN
    v_is_daily := true;
    v_daily_on := (p_opens_at AT TIME ZONE 'utc')::date;
  ELSE
    v_is_daily := false;
    v_daily_on := NULL;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.marshmallows (
      question, topic_id, opens_at, closes_at, reveals_at, status,
      is_daily, daily_on, play_mode, created_by
    ) VALUES (
      trim(p_question), p_topic_id, p_opens_at, p_closes_at, p_reveals_at,
      'draft', v_is_daily, v_daily_on, v_mode, v_admin
    )
    RETURNING * INTO v_row;
    v_action := 'created_draft';
  ELSE
    SELECT * INTO v_row FROM public.marshmallows WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'marshmallow_not_found';
    END IF;
    IF v_row.status NOT IN ('draft', 'scheduled') THEN
      RAISE EXCEPTION 'marshmallow_locked';
    END IF;

    UPDATE public.marshmallows SET
      question = trim(p_question),
      topic_id = p_topic_id,
      opens_at = p_opens_at,
      closes_at = p_closes_at,
      reveals_at = p_reveals_at,
      is_daily = v_is_daily,
      daily_on = v_daily_on,
      play_mode = v_mode
    WHERE id = p_id
    RETURNING * INTO v_row;
    v_action := 'updated_draft';
  END IF;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = v_row.id;
  v_order := 0;
  FOR v_choice IN SELECT value FROM jsonb_array_elements(p_choices)
  LOOP
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (v_row.id, trim(v_choice->>'label'), v_order);
    v_order := v_order + 1;
  END LOOP;

  PERFORM public.write_admin_audit(
    v_action,
    v_row.id,
    jsonb_build_object('status', v_row.status, 'play_mode', v_row.play_mode)
  );

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'daily_conflict';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_duplicate_marshmallow(p_id uuid)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src public.marshmallows%ROWTYPE;
  v_choices jsonb;
  v_now timestamptz := now();
  v_close interval;
  v_reveal interval;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO v_src FROM public.marshmallows WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('label', c.label, 'sort_order', c.sort_order) ORDER BY c.sort_order),
    '[]'::jsonb
  )
  INTO v_choices
  FROM public.marshmallow_choices c
  WHERE c.marshmallow_id = p_id;

  IF v_src.play_mode = 'quick' THEN
    v_close := interval '2 minutes';
    v_reveal := interval '3 minutes';
  ELSIF v_src.play_mode = 'live' THEN
    v_close := interval '30 minutes';
    v_reveal := interval '45 minutes';
  ELSE
    v_close := interval '12 hours';
    v_reveal := interval '18 hours';
  END IF;

  RETURN public.admin_upsert_marshmallow(
    v_src.question,
    v_now,
    v_now + v_close,
    v_now + v_reveal,
    v_choices,
    NULL,
    v_src.topic_id,
    v_src.is_daily,
    v_src.play_mode
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_beta_feedback(
  p_rating text,
  p_context text,
  p_comment text DEFAULT NULL,
  p_marshmallow_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  INSERT INTO public.beta_feedback (user_id, rating, comment, context, marshmallow_id)
  VALUES (v_uid, p_rating, nullif(trim(coalesce(p_comment, '')), ''), p_context, p_marshmallow_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reveal_return_metrics_by_mode()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    FROM (
      SELECT
        m.play_mode::text AS play_mode,
        count(e.id)::int AS eligible_sealed_reveals,
        count(ro.opened_at)::int AS first_reveal_opens,
        CASE
          WHEN count(e.id) = 0 THEN NULL
          ELSE round(count(ro.opened_at)::numeric / count(e.id), 4)
        END AS rrr
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL
        AND m.status = 'revealed'
        AND m.cancelled_at IS NULL
      GROUP BY m.play_mode
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_beta_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_signups int;
  v_onboarded int;
  v_first_seal int;
  v_first_seal_s numeric;
  v_first_payoff_s numeric;
  v_quick_sealers int;
  v_quick_continued int;
  v_multi_session int;
  v_reveal_opens int;
  v_reveal_comp int;
  v_next_play int;
  v_multi_seal int;
  v_scored int;
  v_qualified int;
  v_mean_acc numeric;
  v_median_acc numeric;
  v_mean_cs numeric;
  v_median_cs numeric;
  v_shares int;
  v_abandon jsonb;
  v_rrr jsonb;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*)::int INTO v_signups FROM public.profiles;
  SELECT count(*)::int INTO v_onboarded FROM public.profiles WHERE onboarding_completed_at IS NOT NULL;
  SELECT count(DISTINCT user_id)::int INTO v_first_seal FROM public.entries WHERE sealed_at IS NOT NULL;

  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (fs.sealed_at - p.onboarding_completed_at))
  )
  INTO v_first_seal_s
  FROM public.profiles p
  JOIN LATERAL (
    SELECT min(sealed_at) AS sealed_at
    FROM public.entries e
    WHERE e.user_id = p.id AND e.sealed_at IS NOT NULL
  ) fs ON fs.sealed_at IS NOT NULL
  WHERE p.onboarding_completed_at IS NOT NULL
    AND fs.sealed_at >= p.onboarding_completed_at;

  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (fo.opened_at - fs.sealed_at))
  )
  INTO v_first_payoff_s
  FROM (
    SELECT user_id, min(sealed_at) AS sealed_at
    FROM public.entries
    WHERE sealed_at IS NOT NULL
    GROUP BY user_id
  ) fs
  JOIN (
    SELECT user_id, min(opened_at) AS opened_at
    FROM public.reveal_opens
    GROUP BY user_id
  ) fo ON fo.user_id = fs.user_id;

  SELECT count(*)::int INTO v_quick_sealers
  FROM (
    SELECT DISTINCT e.user_id
    FROM public.entries e
    JOIN public.marshmallows m ON m.id = e.marshmallow_id
    WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
  ) q;

  SELECT count(*)::int INTO v_quick_continued
  FROM (
    SELECT DISTINCT ON (e.user_id)
      e.user_id,
      e.marshmallow_id,
      e.sealed_at
    FROM public.entries e
    JOIN public.marshmallows m ON m.id = e.marshmallow_id
    WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
    ORDER BY e.user_id, e.sealed_at
  ) fq
  WHERE EXISTS (
    SELECT 1
    FROM public.entries e2
    WHERE e2.user_id = fq.user_id
      AND e2.marshmallow_id <> fq.marshmallow_id
      AND e2.sealed_at IS NOT NULL
      AND e2.sealed_at >= fq.sealed_at
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.reveal_opens ro
          WHERE ro.user_id = fq.user_id AND ro.marshmallow_id = fq.marshmallow_id
        )
        OR e2.sealed_at < (
          SELECT ro.opened_at FROM public.reveal_opens ro
          WHERE ro.user_id = fq.user_id AND ro.marshmallow_id = fq.marshmallow_id
        )
      )
  );

  -- Session = 30 minutes from the user's first seal.
  SELECT count(*)::int INTO v_multi_session
  FROM (
    SELECT e.user_id
    FROM public.entries e
    JOIN (
      SELECT user_id, min(sealed_at) AS first_sealed
      FROM public.entries
      WHERE sealed_at IS NOT NULL
      GROUP BY user_id
    ) fs ON fs.user_id = e.user_id
    WHERE e.sealed_at IS NOT NULL
      AND e.sealed_at <= fs.first_sealed + interval '30 minutes'
    GROUP BY e.user_id
    HAVING count(*) >= 2
  ) s;

  SELECT count(*)::int INTO v_reveal_opens FROM public.reveal_opens;
  SELECT count(*)::int INTO v_reveal_comp
  FROM public.product_events WHERE event_type = 'reveal_completed';

  SELECT count(*)::int INTO v_next_play
  FROM (
    SELECT DISTINCT e.user_id
    FROM public.entries e
    WHERE e.sealed_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.reveal_opens ro
        WHERE ro.user_id = e.user_id AND ro.opened_at < e.sealed_at
      )
  ) n;

  SELECT count(*)::int INTO v_multi_seal
  FROM (
    SELECT user_id
    FROM public.entries
    WHERE sealed_at IS NOT NULL
    GROUP BY user_id
    HAVING count(*) >= 2
  ) x;

  SELECT count(DISTINCT user_id)::int INTO v_scored FROM public.scores;
  SELECT count(*)::int INTO v_qualified
  FROM public.crowdsense_ratings
  WHERE category_id IS NULL AND qualified;

  SELECT avg(accuracy), percentile_cont(0.5) WITHIN GROUP (ORDER BY accuracy)
  INTO v_mean_acc, v_median_acc
  FROM public.scores;

  SELECT avg(rating), percentile_cont(0.5) WITHIN GROUP (ORDER BY rating)
  INTO v_mean_cs, v_median_cs
  FROM public.crowdsense_ratings
  WHERE category_id IS NULL AND qualified;

  SELECT count(DISTINCT user_id)::int INTO v_shares FROM public.share_cards;

  SELECT public.get_reveal_return_metrics_by_mode() INTO v_rrr;

  SELECT jsonb_build_object(
    'onboarded_never_viewed', (
      SELECT count(*)::int FROM public.profiles p
      WHERE p.onboarding_completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.product_events ev
          WHERE ev.user_id = p.id AND ev.event_type = 'marshmallow_viewed'
        )
    ),
    'viewed_no_answer', (
      SELECT count(DISTINCT ev.user_id)::int
      FROM public.product_events ev
      WHERE ev.event_type = 'marshmallow_viewed'
        AND NOT EXISTS (
          SELECT 1 FROM public.product_events a
          WHERE a.user_id = ev.user_id AND a.event_type = 'answer_selected'
        )
    ),
    'answered_never_sealed', (
      SELECT count(DISTINCT ev.user_id)::int
      FROM public.product_events ev
      WHERE ev.event_type = 'answer_selected'
        AND NOT EXISTS (
          SELECT 1 FROM public.entries e
          WHERE e.user_id = ev.user_id AND e.sealed_at IS NOT NULL
        )
    ),
    'sealed_quick_no_chain', (
      SELECT count(*)::int
      FROM (
        SELECT DISTINCT ON (e.user_id) e.user_id, e.marshmallow_id, e.sealed_at
        FROM public.entries e
        JOIN public.marshmallows m ON m.id = e.marshmallow_id
        WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
        ORDER BY e.user_id, e.sealed_at
      ) fq
      WHERE NOT EXISTS (
        SELECT 1 FROM public.entries e2
        WHERE e2.user_id = fq.user_id
          AND e2.marshmallow_id <> fq.marshmallow_id
          AND e2.sealed_at IS NOT NULL
          AND e2.sealed_at >= fq.sealed_at
          AND (
            NOT EXISTS (
              SELECT 1 FROM public.reveal_opens ro
              WHERE ro.user_id = fq.user_id AND ro.marshmallow_id = fq.marshmallow_id
            )
            OR e2.sealed_at < (
              SELECT ro.opened_at FROM public.reveal_opens ro
              WHERE ro.user_id = fq.user_id AND ro.marshmallow_id = fq.marshmallow_id
            )
          )
      )
    ),
    'quick_ready_never_opened', (
      SELECT count(DISTINCT e.user_id)::int
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL
        AND m.play_mode = 'quick'
        AND m.status = 'revealed'
        AND m.cancelled_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.reveal_opens ro
          WHERE ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
        )
    ),
    'daily_ready_never_returned', (
      SELECT count(DISTINCT e.user_id)::int
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL
        AND m.play_mode = 'daily'
        AND m.status = 'revealed'
        AND m.cancelled_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.reveal_opens ro
          WHERE ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
        )
    ),
    'revealed_never_played_again', (
      SELECT count(DISTINCT ro.user_id)::int
      FROM public.reveal_opens ro
      WHERE NOT EXISTS (
        SELECT 1 FROM public.entries e
        WHERE e.user_id = ro.user_id
          AND e.sealed_at IS NOT NULL
          AND e.sealed_at > ro.opened_at
      )
    )
  ) INTO v_abandon;

  RETURN jsonb_build_object(
    'users', jsonb_build_object(
      'signups', v_signups,
      'onboarded', v_onboarded,
      'first_seal', v_first_seal
    ),
    'activation', jsonb_build_object(
      'median_first_seal_seconds', v_first_seal_s,
      'median_first_payoff_seconds', v_first_payoff_s,
      'quick_sealers', v_quick_sealers,
      'quick_continued', v_quick_continued,
      'first_session_multi_play', v_multi_session,
      'session_idle_seconds', 1800
    ),
    'return', jsonb_build_object(
      'by_mode', v_rrr
    ),
    'continuation', jsonb_build_object(
      'reveal_opens', v_reveal_opens,
      'reveal_completions', v_reveal_comp,
      'next_play', v_next_play,
      'multi_seal', v_multi_seal,
      'scored', v_scored,
      'qualified', v_qualified
    ),
    'skill', jsonb_build_object(
      'qualified', v_qualified,
      'mean_accuracy', v_mean_acc,
      'median_accuracy', v_median_acc,
      'mean_crowdsense', v_mean_cs,
      'median_crowdsense', v_median_cs
    ),
    'viral', jsonb_build_object(
      'shares', v_shares,
      'reveal_openers', v_reveal_opens
    ),
    'abandonment', v_abandon
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_content_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.opens_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        m.id,
        m.question,
        m.play_mode::text AS play_mode,
        m.status::text AS status,
        m.opens_at,
        m.topic_id,
        t.name AS topic_name,
        (SELECT count(*)::int FROM public.marshmallow_choices c WHERE c.marshmallow_id = m.id) AS choice_count,
        (
          SELECT count(DISTINCT ev.user_id)::int
          FROM public.product_events ev
          WHERE ev.marshmallow_id = m.id AND ev.event_type = 'marshmallow_viewed'
        ) AS views,
        (
          SELECT count(*)::int FROM public.entries e
          WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
        ) AS sealed,
        (
          SELECT count(*)::int FROM public.entries e
          WHERE e.marshmallow_id = m.id
            AND e.sealed_at IS NOT NULL
            AND m.status = 'revealed'
            AND m.cancelled_at IS NULL
        ) AS eligible_reveals,
        (
          SELECT count(*)::int FROM public.reveal_opens ro
          WHERE ro.marshmallow_id = m.id
        ) AS reveal_opens,
        (
          SELECT avg(s.accuracy) FROM public.scores s
          WHERE s.marshmallow_id = m.id
        ) AS average_accuracy,
        (
          SELECT count(DISTINCT e.user_id)::int
          FROM public.reveal_opens ro
          JOIN public.entries e ON e.user_id = ro.user_id
          WHERE ro.marshmallow_id = m.id
            AND e.marshmallow_id <> m.id
            AND e.sealed_at IS NOT NULL
            AND e.sealed_at > ro.opened_at
        ) AS next_play,
        (
          SELECT count(DISTINCT sc.user_id)::int
          FROM public.share_cards sc
          WHERE sc.marshmallow_id = m.id
        ) AS shares
      FROM public.marshmallows m
      LEFT JOIN public.topics t ON t.id = m.topic_id
      WHERE m.status <> 'draft'
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_beta_cohorts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.week DESC), '[]'::jsonb)
    FROM (
      SELECT
        date_trunc('week', p.created_at AT TIME ZONE 'utc')::date AS week,
        count(*)::int AS users,
        count(p.onboarding_completed_at)::int AS onboarded,
        count(fs.sealed_at)::int AS first_seal,
        count(fq.opened_at)::int AS first_quick_payoff,
        count(dr.opened_at)::int AS daily_reveal_return,
        count(ms.user_id)::int AS second_seal,
        count(q.user_id)::int AS qualified_5
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT min(sealed_at) AS sealed_at
        FROM public.entries e
        WHERE e.user_id = p.id AND e.sealed_at IS NOT NULL
      ) fs ON true
      LEFT JOIN LATERAL (
        SELECT min(ro.opened_at) AS opened_at
        FROM public.reveal_opens ro
        JOIN public.marshmallows m ON m.id = ro.marshmallow_id
        WHERE ro.user_id = p.id AND m.play_mode = 'quick'
      ) fq ON true
      LEFT JOIN LATERAL (
        SELECT min(ro.opened_at) AS opened_at
        FROM public.reveal_opens ro
        JOIN public.marshmallows m ON m.id = ro.marshmallow_id
        JOIN public.entries e
          ON e.user_id = ro.user_id AND e.marshmallow_id = ro.marshmallow_id
        WHERE ro.user_id = p.id
          AND m.play_mode = 'daily'
          AND e.sealed_at IS NOT NULL
      ) dr ON true
      LEFT JOIN LATERAL (
        SELECT e.user_id
        FROM public.entries e
        WHERE e.user_id = p.id AND e.sealed_at IS NOT NULL
        GROUP BY e.user_id
        HAVING count(*) >= 2
      ) ms ON true
      LEFT JOIN LATERAL (
        SELECT cr.user_id
        FROM public.crowdsense_ratings cr
        WHERE cr.user_id = p.id AND cr.category_id IS NULL AND cr.qualified
      ) q ON true
      GROUP BY 1
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_accuracy_calibration()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total int;
  v_mean numeric;
  v_median numeric;
  v_p10 numeric;
  v_p25 numeric;
  v_p75 numeric;
  v_p90 numeric;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*)::int, avg(accuracy) INTO v_total, v_mean FROM public.scores;
  SELECT
    percentile_cont(0.10) WITHIN GROUP (ORDER BY accuracy),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY accuracy),
    percentile_cont(0.50) WITHIN GROUP (ORDER BY accuracy),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY accuracy),
    percentile_cont(0.90) WITHIN GROUP (ORDER BY accuracy)
  INTO v_p10, v_p25, v_median, v_p75, v_p90
  FROM public.scores;

  RETURN jsonb_build_object(
    'total_official_scores', v_total,
    'mean_accuracy', v_mean,
    'median_accuracy', v_median,
    'p10', v_p10,
    'p25', v_p25,
    'p75', v_p75,
    'p90', v_p90,
    'by_mode', (
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT m.play_mode::text AS play_mode, count(*)::int AS n, avg(s.accuracy) AS mean_accuracy
        FROM public.scores s
        JOIN public.marshmallows m ON m.id = s.marshmallow_id
        GROUP BY m.play_mode
      ) x
    ),
    'by_choice_count', (
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT
          (SELECT count(*)::int FROM public.marshmallow_choices c WHERE c.marshmallow_id = s.marshmallow_id) AS choice_count,
          count(*)::int AS n,
          avg(s.accuracy) AS mean_accuracy
        FROM public.scores s
        GROUP BY 1
      ) x
    ),
    'by_category', (
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(parent.name, t.name, 'Uncategorized') AS category,
          count(*)::int AS n,
          avg(s.accuracy) AS mean_accuracy
        FROM public.scores s
        JOIN public.marshmallows m ON m.id = s.marshmallow_id
        LEFT JOIN public.topics t ON t.id = m.topic_id
        LEFT JOIN public.topics parent ON parent.id = t.parent_id
        GROUP BY 1
      ) x
    ),
    'qualified_crowdsense_count', (
      SELECT count(*)::int FROM public.crowdsense_ratings
      WHERE category_id IS NULL AND qualified
    ),
    'mean_qualified_crowdsense', (
      SELECT avg(rating) FROM public.crowdsense_ratings
      WHERE category_id IS NULL AND qualified
    ),
    'median_qualified_crowdsense', (
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY rating)
      FROM public.crowdsense_ratings
      WHERE category_id IS NULL AND qualified
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_beta_feedback()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        f.id,
        f.rating,
        f.comment,
        f.context,
        f.marshmallow_id,
        f.created_at,
        p.username
      FROM public.beta_feedback f
      JOIN public.profiles p ON p.id = f.user_id
    ) x
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean, public.play_mode) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean, public.play_mode) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_duplicate_marshmallow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_marshmallow(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_beta_feedback(text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_beta_feedback(text, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_reveal_return_metrics_by_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reveal_return_metrics_by_mode() TO authenticated;
REVOKE ALL ON FUNCTION public.get_beta_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_beta_health() TO authenticated;
REVOKE ALL ON FUNCTION public.get_content_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_health() TO authenticated;
REVOKE ALL ON FUNCTION public.get_beta_cohorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_beta_cohorts() TO authenticated;
REVOKE ALL ON FUNCTION public.get_accuracy_calibration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_accuracy_calibration() TO authenticated;
REVOKE ALL ON FUNCTION public.list_beta_feedback() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_beta_feedback() TO authenticated;
