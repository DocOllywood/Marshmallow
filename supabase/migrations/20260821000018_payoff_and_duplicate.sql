-- Quick first-payoff delay uses result_available_at so sample wait
-- is not counted as a delayed-return failure. Daily RRR is unchanged.
-- Duplicate helper uses the beta Quick preset: close 3m / reveal 4m / hard 10m.

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
  v_hard timestamptz;
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
    v_close := interval '3 minutes';
    v_reveal := interval '4 minutes';
    v_hard := v_now + interval '10 minutes';
  ELSIF v_src.play_mode = 'live' THEN
    v_close := interval '30 minutes';
    v_reveal := interval '45 minutes';
    v_hard := v_now + v_reveal;
  ELSE
    v_close := interval '12 hours';
    v_reveal := interval '18 hours';
    v_hard := v_now + v_reveal;
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
    v_src.play_mode,
    v_src.minimum_result_sample,
    v_hard
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

  -- Clock starts at first seal or legitimate result availability, whichever is later.
  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (
      fo.opened_at - GREATEST(fs.sealed_at, coalesce(m.result_available_at, fo.opened_at))
    ))
  )
  INTO v_first_payoff_s
  FROM (
    SELECT user_id, min(sealed_at) AS sealed_at
    FROM public.entries
    WHERE sealed_at IS NOT NULL
    GROUP BY user_id
  ) fs
  JOIN LATERAL (
    SELECT ro.opened_at, ro.marshmallow_id
    FROM public.reveal_opens ro
    WHERE ro.user_id = fs.user_id
    ORDER BY ro.opened_at
    LIMIT 1
  ) fo ON true
  JOIN public.marshmallows m ON m.id = fo.marshmallow_id;

  SELECT count(*)::int INTO v_quick_sealers
  FROM (
    SELECT DISTINCT e.user_id
    FROM public.entries e
    JOIN public.marshmallows m ON m.id = e.marshmallow_id
    WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
  ) q;

  SELECT count(*)::int INTO v_quick_continued
  FROM (
    SELECT e.user_id
    FROM public.entries e
    JOIN public.marshmallows m ON m.id = e.marshmallow_id
    WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
    GROUP BY e.user_id
    HAVING count(*) >= 2
  ) q;

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
      'session_idle_seconds', 1800,
      'payoff_from', 'result_available_at'
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
