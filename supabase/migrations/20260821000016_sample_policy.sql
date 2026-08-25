-- Minimum-sample reveal policy on the shared lifecycle.
-- Quick can wait past reveals_at until sample or hard_reveals_at.
-- Voting never reopens after closes_at. result_available_at is the
-- authoritative "result exists" timestamp for Quick payoff/delay.

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS minimum_result_sample integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hard_reveals_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_available_at timestamptz;

UPDATE public.marshmallows
SET
  minimum_result_sample = CASE WHEN play_mode = 'quick' THEN 5 ELSE 0 END,
  hard_reveals_at = CASE
    WHEN play_mode = 'quick' AND status NOT IN ('revealed', 'cancelled', 'archived')
      THEN reveals_at + interval '6 minutes'
    ELSE reveals_at
  END
WHERE hard_reveals_at IS NULL;

UPDATE public.marshmallows m
SET result_available_at = r.computed_at
FROM public.marshmallow_results r
WHERE r.marshmallow_id = m.id
  AND m.result_available_at IS NULL
  AND m.status = 'revealed';

ALTER TABLE public.marshmallows
  ALTER COLUMN hard_reveals_at SET NOT NULL;

ALTER TABLE public.marshmallows
  DROP CONSTRAINT IF EXISTS marshmallows_sample_ck;

ALTER TABLE public.marshmallows
  ADD CONSTRAINT marshmallows_sample_ck CHECK (
    minimum_result_sample >= 0
    AND hard_reveals_at >= reveals_at
  );

CREATE OR REPLACE FUNCTION public.tg_marshmallows_user_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'marshmallows_not_user_writable';
  END IF;
  IF NEW.opens_at IS DISTINCT FROM OLD.opens_at
     OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
     OR NEW.reveals_at IS DISTINCT FROM OLD.reveals_at
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_daily IS DISTINCT FROM OLD.is_daily
     OR NEW.daily_on IS DISTINCT FROM OLD.daily_on
     OR NEW.play_mode IS DISTINCT FROM OLD.play_mode
     OR NEW.minimum_result_sample IS DISTINCT FROM OLD.minimum_result_sample
     OR NEW.hard_reveals_at IS DISTINCT FROM OLD.hard_reveals_at
     OR NEW.result_available_at IS DISTINCT FROM OLD.result_available_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ready_to_finalize(p_marshmallow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.marshmallows%ROWTYPE;
  v_sealed int := 0;
BEGIN
  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_m.status IS DISTINCT FROM 'closed' OR v_m.cancelled_at IS NOT NULL THEN
    RETURN false;
  END IF;
  IF now() < v_m.reveals_at THEN
    RETURN false;
  END IF;
  SELECT count(*)::int INTO v_sealed
  FROM public.entries
  WHERE marshmallow_id = p_marshmallow_id AND sealed_at IS NOT NULL;
  IF v_sealed >= coalesce(v_m.minimum_result_sample, 0) THEN
    RETURN true;
  END IF;
  RETURN now() >= coalesce(v_m.hard_reveals_at, v_m.reveals_at);
END;
$$;

REVOKE ALL ON FUNCTION public.ready_to_finalize(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ready_to_finalize(uuid) TO service_role;

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

  UPDATE public.marshmallows
  SET status = 'revealed',
      result_available_at = coalesce(result_available_at, v_now)
  WHERE id = p_marshmallow_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_marshmallow(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_marshmallow(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.run_due_lifecycle(p_source text DEFAULT 'admin')
RETURNS public.lifecycle_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source text := COALESCE(p_source, 'admin');
  v_opened int := 0;
  v_closed int := 0;
  v_revealed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_id uuid;
  v_run public.lifecycle_runs%ROWTYPE;
BEGIN
  IF v_source NOT IN ('cron', 'admin') THEN
    RAISE EXCEPTION 'source_invalid';
  END IF;

  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_source = 'admin' THEN
    PERFORM public.assert_admin();
  END IF;

  FOR v_id IN
    SELECT id FROM public.marshmallows
    WHERE status = 'scheduled' AND opens_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.marshmallows SET status = 'open' WHERE id = v_id;
    v_opened := v_opened + 1;
  END LOOP;

  FOR v_id IN
    SELECT id FROM public.marshmallows
    WHERE status = 'open' AND closes_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.marshmallows SET status = 'closed' WHERE id = v_id;
    v_closed := v_closed + 1;
  END LOOP;

  FOR v_id IN
    SELECT id FROM public.marshmallows
    WHERE status = 'closed'
      AND cancelled_at IS NULL
      AND public.ready_to_finalize(id)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.finalize_marshmallow(v_id);
      v_revealed := v_revealed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('marshmallow_id', v_id, 'error', SQLERRM)
      );
    END;
  END LOOP;

  INSERT INTO public.lifecycle_runs (
    actor_id, source, opened_count, closed_count, revealed_count, error_count, details
  ) VALUES (
    auth.uid(),
    v_source,
    v_opened,
    v_closed,
    v_revealed,
    jsonb_array_length(v_errors),
    jsonb_build_object('errors', v_errors)
  )
  RETURNING * INTO v_run;

  RETURN v_run;
END;
$$;

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

  -- Delay starts when the result is actually available, not the target reveals_at.
  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (ro.opened_at - coalesce(m.result_available_at, m.reveals_at)))
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
    'median_open_seconds', v_median,
    'delay_from', 'result_available_at'
  );
END;
$$;

DROP FUNCTION IF EXISTS public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean, public.play_mode);

CREATE OR REPLACE FUNCTION public.admin_upsert_marshmallow(
  p_question text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_reveals_at timestamptz,
  p_choices jsonb,
  p_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_is_daily boolean DEFAULT false,
  p_play_mode public.play_mode DEFAULT NULL,
  p_minimum_result_sample integer DEFAULT NULL,
  p_hard_reveals_at timestamptz DEFAULT NULL
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
  v_min int;
  v_hard timestamptz;
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
    v_min := coalesce(p_minimum_result_sample, 0);
    v_hard := coalesce(p_hard_reveals_at, p_reveals_at);
  ELSIF v_mode = 'quick' THEN
    v_is_daily := false;
    v_daily_on := NULL;
    v_min := coalesce(p_minimum_result_sample, 5);
    v_hard := coalesce(p_hard_reveals_at, p_reveals_at + interval '6 minutes');
  ELSE
    v_is_daily := false;
    v_daily_on := NULL;
    v_min := coalesce(p_minimum_result_sample, 0);
    v_hard := coalesce(p_hard_reveals_at, p_reveals_at);
  END IF;

  IF v_hard < p_reveals_at OR v_min < 0 THEN
    RAISE EXCEPTION 'timestamps_invalid';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.marshmallows (
      question, topic_id, opens_at, closes_at, reveals_at, status,
      is_daily, daily_on, play_mode, minimum_result_sample, hard_reveals_at, created_by
    ) VALUES (
      trim(p_question), p_topic_id, p_opens_at, p_closes_at, p_reveals_at,
      'draft', v_is_daily, v_daily_on, v_mode, v_min, v_hard, v_admin
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
      play_mode = v_mode,
      minimum_result_sample = v_min,
      hard_reveals_at = v_hard
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

REVOKE ALL ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean, public.play_mode, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean, public.play_mode, integer, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quick_test_session()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open int;
  v_cooking int;
  v_ready int;
  v_eligible int;
BEGIN
  PERFORM public.assert_admin();
  SELECT count(*)::int INTO v_open
  FROM public.marshmallows WHERE play_mode = 'quick' AND status = 'open';
  SELECT count(*)::int INTO v_cooking
  FROM public.marshmallows
  WHERE play_mode = 'quick' AND status = 'closed' AND cancelled_at IS NULL;
  SELECT count(*)::int INTO v_ready
  FROM public.marshmallows WHERE play_mode = 'quick' AND status = 'revealed';
  SELECT count(*)::int INTO v_eligible
  FROM public.profiles WHERE onboarding_completed_at IS NOT NULL;

  RETURN jsonb_build_object(
    'inventory', jsonb_build_object(
      'open', v_open,
      'cooking', v_cooking,
      'ready', v_ready,
      'warn_below', 5,
      'warning', v_open < 5
    ),
    'eligible_players', v_eligible,
    'board', (
      SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.opens_at), '[]'::jsonb)
      FROM (
        SELECT
          m.id,
          m.question,
          m.status::text AS status,
          m.opens_at,
          m.closes_at,
          m.reveals_at,
          m.hard_reveals_at,
          m.minimum_result_sample,
          m.result_available_at,
          (
            SELECT count(*)::int FROM public.entries e
            WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
          ) AS sealed_count,
          public.ready_to_finalize(m.id) AS ready_to_finalize
        FROM public.marshmallows m
        WHERE m.play_mode = 'quick'
          AND m.status IN ('scheduled', 'open', 'closed', 'revealed')
      ) x
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quick_sample_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n int;
BEGIN
  PERFORM public.assert_admin();
  SELECT count(*)::int INTO v_n
  FROM public.marshmallows
  WHERE play_mode = 'quick' AND status = 'revealed';

  RETURN jsonb_build_object(
    'revealed_quicks', v_n,
    'median_sample', (
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY r.total_sealed_votes)
      FROM public.marshmallow_results r
      JOIN public.marshmallows m ON m.id = r.marshmallow_id
      WHERE m.play_mode = 'quick' AND m.status = 'revealed'
    ),
    'reached_minimum_before_target', (
      SELECT count(*)::int
      FROM public.marshmallow_results r
      JOIN public.marshmallows m ON m.id = r.marshmallow_id
      WHERE m.play_mode = 'quick' AND m.status = 'revealed'
        AND r.total_sealed_votes >= m.minimum_result_sample
        AND coalesce(m.result_available_at, r.computed_at) <= m.reveals_at + interval '15 seconds'
    ),
    'required_extension', (
      SELECT count(*)::int
      FROM public.marshmallows m
      JOIN public.marshmallow_results r ON r.marshmallow_id = m.id
      WHERE m.play_mode = 'quick' AND m.status = 'revealed'
        AND coalesce(m.result_available_at, r.computed_at) > m.reveals_at + interval '15 seconds'
    ),
    'hit_hard_maximum', (
      SELECT count(*)::int
      FROM public.marshmallows m
      JOIN public.marshmallow_results r ON r.marshmallow_id = m.id
      WHERE m.play_mode = 'quick' AND m.status = 'revealed'
        AND coalesce(m.result_available_at, r.computed_at) >= m.hard_reveals_at - interval '5 seconds'
    ),
    'zero_response', (
      SELECT count(*)::int
      FROM public.marshmallow_results r
      JOIN public.marshmallows m ON m.id = r.marshmallow_id
      WHERE m.play_mode = 'quick' AND m.status = 'revealed' AND r.total_sealed_votes = 0
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mode_payoff_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN jsonb_build_object(
    'quick', (
      SELECT jsonb_build_object(
        'first_seal', count(DISTINCT e.user_id),
        'continued', (
          SELECT count(*) FROM (
            SELECT DISTINCT ON (e2.user_id) e2.user_id
            FROM public.entries e2
            JOIN public.marshmallows mq ON mq.id = e2.marshmallow_id
            WHERE e2.sealed_at IS NOT NULL AND mq.play_mode = 'quick'
          ) q
        ),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed'),
        'reveal_opens', count(ro.opened_at),
        'avg_sample', (
          SELECT avg(r.total_sealed_votes)
          FROM public.marshmallow_results r
          JOIN public.marshmallows mq ON mq.id = r.marshmallow_id
          WHERE mq.play_mode = 'quick'
        ),
        'median_payoff_seconds', (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (
              ro2.opened_at - GREATEST(e3.sealed_at, coalesce(m2.result_available_at, ro2.opened_at))
            ))
          )
          FROM public.reveal_opens ro2
          JOIN public.entries e3
            ON e3.user_id = ro2.user_id AND e3.marshmallow_id = ro2.marshmallow_id
          JOIN public.marshmallows m2 ON m2.id = ro2.marshmallow_id
          WHERE m2.play_mode = 'quick' AND e3.sealed_at IS NOT NULL
        )
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
    ),
    'daily', (
      SELECT jsonb_build_object(
        'seals', count(*),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed' AND m.cancelled_at IS NULL),
        'reveal_opens', count(ro.opened_at),
        'median_return_delay_seconds', (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (ro2.opened_at - coalesce(m2.result_available_at, m2.reveals_at)))
          )
          FROM public.reveal_opens ro2
          JOIN public.marshmallows m2 ON m2.id = ro2.marshmallow_id
          WHERE m2.play_mode = 'daily'
        )
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'daily'
    ),
    'live', (
      SELECT jsonb_build_object(
        'seals', count(*),
        'reveal_opens', count(ro.opened_at),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed' AND m.cancelled_at IS NULL)
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'live'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quick_test_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quick_test_session() TO authenticated;
REVOKE ALL ON FUNCTION public.get_quick_sample_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quick_sample_health() TO authenticated;
REVOKE ALL ON FUNCTION public.get_mode_payoff_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mode_payoff_metrics() TO authenticated;
