-- CrowdSense aggregates, public identity RPCs, and leaderboard.
-- Skill ratings are rebuilt only from official scores.accuracy.

CREATE TABLE public.crowdsense_ratings (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.topics (id) ON DELETE CASCADE,
  scored_count integer NOT NULL CHECK (scored_count >= 0),
  accuracy_sum integer NOT NULL CHECK (accuracy_sum >= 0),
  adjusted_accuracy numeric(10, 6) NOT NULL,
  rating integer CHECK (rating IS NULL OR (rating >= 500 AND rating <= 1000)),
  qualified boolean NOT NULL,
  rebuilt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, category_id)
);

CREATE TABLE public.crowdsense_weekly (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  scored_count integer NOT NULL CHECK (scored_count >= 0),
  accuracy_sum integer NOT NULL CHECK (accuracy_sum >= 0),
  adjusted_accuracy numeric(10, 6) NOT NULL,
  rating integer CHECK (rating IS NULL OR (rating >= 500 AND rating <= 1000)),
  qualified boolean NOT NULL,
  rebuilt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

CREATE INDEX crowdsense_ratings_overall_board_idx
  ON public.crowdsense_ratings (rating DESC, scored_count DESC, adjusted_accuracy DESC)
  WHERE qualified AND category_id IS NULL;

CREATE INDEX crowdsense_ratings_category_board_idx
  ON public.crowdsense_ratings (category_id, rating DESC, scored_count DESC, adjusted_accuracy DESC)
  WHERE qualified AND category_id IS NOT NULL;

CREATE INDEX crowdsense_weekly_board_idx
  ON public.crowdsense_weekly (week_start, rating DESC, scored_count DESC, adjusted_accuracy DESC)
  WHERE qualified;

CREATE INDEX scores_user_calculated_idx
  ON public.scores (user_id, calculated_at DESC);

CREATE INDEX marshmallows_topic_id_idx
  ON public.marshmallows (topic_id);

ALTER TABLE public.crowdsense_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsense_weekly ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.crowdsense_ratings TO authenticated;
GRANT SELECT ON public.crowdsense_weekly TO authenticated;

CREATE POLICY crowdsense_ratings_select_own
  ON public.crowdsense_ratings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY crowdsense_weekly_select_own
  ON public.crowdsense_weekly FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.crowdsense_utc_week_start(p_at timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (date_trunc('week', p_at AT TIME ZONE 'utc'))::date;
$$;

CREATE OR REPLACE FUNCTION public.crowdsense_world_id(p_topic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cursor uuid := p_topic_id;
  v_id uuid;
  v_parent uuid;
  v_slug text;
  v_guard int := 0;
BEGIN
  IF v_cursor IS NULL THEN
    RETURN NULL;
  END IF;

  LOOP
    v_guard := v_guard + 1;
    IF v_guard > 16 THEN
      RETURN NULL;
    END IF;

    SELECT t.id, t.parent_id, t.slug
    INTO v_id, v_parent, v_slug
    FROM public.topics t
    WHERE t.id = v_cursor;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF v_parent IS NULL THEN
      IF v_slug IN ('reality-tv', 'celebrity', 'pop-culture', 'internet-culture') THEN
        RETURN v_id;
      END IF;
      RETURN NULL;
    END IF;

    v_cursor := v_parent;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.crowdsense_adjusted(
  p_sum numeric,
  p_count integer,
  p_weight integer
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (p_weight * 70 + p_sum) / (p_weight + p_count);
$$;

CREATE OR REPLACE FUNCTION public.crowdsense_map_rating(p_adjusted numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT GREATEST(500, LEAST(1000, round(200 + 8 * p_adjusted)::integer));
$$;

CREATE OR REPLACE FUNCTION public.rebuild_crowdsense(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_count int;
  v_sum int;
  v_adjusted numeric;
  v_week date := public.crowdsense_utc_week_start(now());
  v_cat record;
BEGIN
  IF p_user_id IS NULL THEN
    FOR v_uid IN SELECT DISTINCT user_id FROM public.scores LOOP
      PERFORM public.rebuild_crowdsense(v_uid);
    END LOOP;
    RETURN;
  END IF;

  v_uid := p_user_id;

  SELECT count(*)::int, coalesce(sum(accuracy), 0)::int
  INTO v_count, v_sum
  FROM public.scores
  WHERE user_id = v_uid;

  DELETE FROM public.crowdsense_ratings WHERE user_id = v_uid;

  IF v_count > 0 THEN
    v_adjusted := public.crowdsense_adjusted(v_sum, v_count, 5);
    INSERT INTO public.crowdsense_ratings (
      user_id, category_id, scored_count, accuracy_sum, adjusted_accuracy, rating, qualified
    ) VALUES (
      v_uid,
      NULL,
      v_count,
      v_sum,
      v_adjusted,
      CASE WHEN v_count >= 5 THEN public.crowdsense_map_rating(v_adjusted) ELSE NULL END,
      v_count >= 5
    );
  END IF;

  FOR v_cat IN
    SELECT public.crowdsense_world_id(m.topic_id) AS category_id,
           count(*)::int AS scored_count,
           coalesce(sum(s.accuracy), 0)::int AS accuracy_sum
    FROM public.scores s
    JOIN public.marshmallows m ON m.id = s.marshmallow_id
    WHERE s.user_id = v_uid
    GROUP BY 1
  LOOP
    IF v_cat.category_id IS NULL THEN
      CONTINUE;
    END IF;
    v_adjusted := public.crowdsense_adjusted(v_cat.accuracy_sum, v_cat.scored_count, 5);
    INSERT INTO public.crowdsense_ratings (
      user_id, category_id, scored_count, accuracy_sum, adjusted_accuracy, rating, qualified
    ) VALUES (
      v_uid,
      v_cat.category_id,
      v_cat.scored_count,
      v_cat.accuracy_sum,
      v_adjusted,
      CASE WHEN v_cat.scored_count >= 5 THEN public.crowdsense_map_rating(v_adjusted) ELSE NULL END,
      v_cat.scored_count >= 5
    );
  END LOOP;

  SELECT count(*)::int, coalesce(sum(accuracy), 0)::int
  INTO v_count, v_sum
  FROM public.scores
  WHERE user_id = v_uid
    AND public.crowdsense_utc_week_start(calculated_at) = v_week;

  DELETE FROM public.crowdsense_weekly
  WHERE user_id = v_uid AND week_start = v_week;

  IF v_count > 0 THEN
    v_adjusted := public.crowdsense_adjusted(v_sum, v_count, 3);
    INSERT INTO public.crowdsense_weekly (
      user_id, week_start, scored_count, accuracy_sum, adjusted_accuracy, rating, qualified
    ) VALUES (
      v_uid,
      v_week,
      v_count,
      v_sum,
      v_adjusted,
      CASE WHEN v_count >= 3 THEN public.crowdsense_map_rating(v_adjusted) ELSE NULL END,
      v_count >= 3
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rebuild_crowdsense()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  PERFORM public.rebuild_crowdsense(NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_crowdsense(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_crowdsense(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.admin_rebuild_crowdsense() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rebuild_crowdsense() TO authenticated;

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
    RETURN;
  END IF;

  IF v_m.status IS DISTINCT FROM 'closed' OR v_m.reveals_at > now() THEN
    RAISE EXCEPTION 'marshmallow_not_ready_to_reveal';
  END IF;

  SELECT count(*)::int INTO v_total
  FROM public.entries
  WHERE marshmallow_id = p_marshmallow_id AND sealed_at IS NOT NULL;

  INSERT INTO public.marshmallow_results (marshmallow_id, total_sealed_votes, computed_at)
  VALUES (p_marshmallow_id, v_total, now())
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
    VALUES (v_entry.user_id, p_marshmallow_id, v_accuracy, v_accuracy, now())
    ON CONFLICT (user_id, marshmallow_id) DO NOTHING;

    PERFORM public.rebuild_crowdsense(v_entry.user_id);
  END LOOP;

  UPDATE public.marshmallows
  SET status = 'revealed'
  WHERE id = p_marshmallow_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_marshmallow(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_marshmallow(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_player(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_overall public.crowdsense_ratings%ROWTYPE;
  v_streak int := 0;
  v_categories jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE username = lower(trim(p_username));

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_overall
  FROM public.crowdsense_ratings
  WHERE user_id = v_profile.id AND category_id IS NULL;

  SELECT coalesce(reveal_current, 0) INTO v_streak
  FROM public.streaks
  WHERE user_id = v_profile.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'slug', t.slug,
    'name', t.name,
    'rating', r.rating,
    'qualified', r.qualified,
    'scored_count', r.scored_count
  ) ORDER BY t.name), '[]'::jsonb)
  INTO v_categories
  FROM public.crowdsense_ratings r
  JOIN public.topics t ON t.id = r.category_id
  WHERE r.user_id = v_profile.id
    AND r.category_id IS NOT NULL
    AND t.slug IN ('reality-tv', 'celebrity', 'pop-culture', 'internet-culture');

  SELECT coalesce(jsonb_agg(item), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT jsonb_build_object(
      'question', m.question,
      'accuracy', s.accuracy,
      'topic_name', t.name,
      'revealed_at', m.reveals_at
    ) AS item
    FROM public.scores s
    JOIN public.marshmallows m ON m.id = s.marshmallow_id
    LEFT JOIN public.topics t ON t.id = m.topic_id
    WHERE s.user_id = v_profile.id
      AND m.status = 'revealed'
      AND m.cancelled_at IS NULL
      AND public.is_revealed(m.id)
    ORDER BY s.calculated_at DESC
    LIMIT 8
  ) recent;

  RETURN jsonb_build_object(
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'crowdsense', CASE
      WHEN v_overall.qualified THEN v_overall.rating
      ELSE NULL
    END,
    'qualified', coalesce(v_overall.qualified, false),
    'scored_count', coalesce(v_overall.scored_count, 0),
    'reveal_streak', v_streak,
    'categories', coalesce(v_categories, '[]'::jsonb),
    'recent', coalesce(v_recent, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_board text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board text := lower(trim(p_board));
  v_week date := public.crowdsense_utc_week_start(now());
  v_category uuid;
  v_rows jsonb := '[]'::jsonb;
  v_population int := 0;
  v_viewer jsonb;
  v_uid uuid := auth.uid();
  v_qualify_at int := 5;
  v_own_count int := 0;
  v_own_qualified boolean := false;
  v_own_rating int;
  v_own_rank int;
BEGIN
  IF v_board NOT IN ('overall', 'weekly', 'reality-tv', 'celebrity', 'pop-culture', 'internet-culture') THEN
    RAISE EXCEPTION 'leaderboard_invalid';
  END IF;

  IF v_board IN ('reality-tv', 'celebrity', 'pop-culture', 'internet-culture') THEN
    SELECT id INTO v_category FROM public.topics WHERE slug = v_board AND parent_id IS NULL;
  END IF;

  IF v_board = 'weekly' THEN
    v_qualify_at := 3;
    SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY ranked.rank), '[]'::jsonb), coalesce(max(ranked.population), 0)
    INTO v_rows, v_population
    FROM (
      SELECT
        p.username,
        p.display_name,
        w.rating,
        w.scored_count,
        w.adjusted_accuracy,
        row_number() OVER (
          ORDER BY w.rating DESC, w.scored_count DESC, w.adjusted_accuracy DESC, p.username ASC
        ) AS rank,
        count(*) OVER ()::int AS population
      FROM public.crowdsense_weekly w
      JOIN public.profiles p ON p.id = w.user_id
      WHERE w.week_start = v_week AND w.qualified
    ) ranked;

    IF v_uid IS NOT NULL THEN
      SELECT scored_count, qualified, rating
      INTO v_own_count, v_own_qualified, v_own_rating
      FROM public.crowdsense_weekly
      WHERE user_id = v_uid AND week_start = v_week;
    END IF;
  ELSIF v_board = 'overall' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY ranked.rank), '[]'::jsonb), coalesce(max(ranked.population), 0)
    INTO v_rows, v_population
    FROM (
      SELECT
        p.username,
        p.display_name,
        r.rating,
        r.scored_count,
        r.adjusted_accuracy,
        row_number() OVER (
          ORDER BY r.rating DESC, r.scored_count DESC, r.adjusted_accuracy DESC, p.username ASC
        ) AS rank,
        count(*) OVER ()::int AS population
      FROM public.crowdsense_ratings r
      JOIN public.profiles p ON p.id = r.user_id
      WHERE r.qualified AND r.category_id IS NULL
    ) ranked;

    IF v_uid IS NOT NULL THEN
      SELECT scored_count, qualified, rating
      INTO v_own_count, v_own_qualified, v_own_rating
      FROM public.crowdsense_ratings
      WHERE user_id = v_uid AND category_id IS NULL;
    END IF;
  ELSE
    SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY ranked.rank), '[]'::jsonb), coalesce(max(ranked.population), 0)
    INTO v_rows, v_population
    FROM (
      SELECT
        p.username,
        p.display_name,
        r.rating,
        r.scored_count,
        r.adjusted_accuracy,
        row_number() OVER (
          ORDER BY r.rating DESC, r.scored_count DESC, r.adjusted_accuracy DESC, p.username ASC
        ) AS rank,
        count(*) OVER ()::int AS population
      FROM public.crowdsense_ratings r
      JOIN public.profiles p ON p.id = r.user_id
      WHERE r.qualified AND r.category_id = v_category
    ) ranked;

    IF v_uid IS NOT NULL THEN
      SELECT scored_count, qualified, rating
      INTO v_own_count, v_own_qualified, v_own_rating
      FROM public.crowdsense_ratings
      WHERE user_id = v_uid AND category_id = v_category;
    END IF;
  END IF;

  v_own_count := coalesce(v_own_count, 0);
  v_own_qualified := coalesce(v_own_qualified, false);

  IF v_uid IS NOT NULL AND v_own_qualified THEN
    SELECT (item->>'rank')::int INTO v_own_rank
    FROM jsonb_array_elements(v_rows) AS item
    WHERE item->>'username' = (SELECT username FROM public.profiles WHERE id = v_uid);
  END IF;

  v_viewer := jsonb_build_object(
    'scored_count', v_own_count,
    'qualified', v_own_qualified,
    'rating', v_own_rating,
    'rank', v_own_rank,
    'remaining', GREATEST(0, v_qualify_at - v_own_count)
  );

  RETURN jsonb_build_object(
    'board', v_board,
    'week_start', v_week,
    'population', v_population,
    'rows', coalesce(v_rows, '[]'::jsonb),
    'viewer', v_viewer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_player(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_player(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO anon, authenticated;

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
    'next_marshmallow_clicked',
    'profile_viewed',
    'leaderboard_viewed',
    'leaderboard_tab_changed',
    'public_profile_viewed'
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
