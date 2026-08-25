-- Align CrowdSense leaderboard tie-break with product spec:
-- 1. CrowdSense rating
-- 2. higher adjusted Accuracy
-- 3. more qualifying scored predictions
-- 4. username (stable)

DROP INDEX IF EXISTS public.crowdsense_ratings_overall_board_idx;
DROP INDEX IF EXISTS public.crowdsense_ratings_category_board_idx;
DROP INDEX IF EXISTS public.crowdsense_weekly_board_idx;

CREATE INDEX crowdsense_ratings_overall_board_idx
  ON public.crowdsense_ratings (rating DESC, adjusted_accuracy DESC, scored_count DESC)
  WHERE qualified AND category_id IS NULL;

CREATE INDEX crowdsense_ratings_category_board_idx
  ON public.crowdsense_ratings (category_id, rating DESC, adjusted_accuracy DESC, scored_count DESC)
  WHERE qualified AND category_id IS NOT NULL;

CREATE INDEX crowdsense_weekly_board_idx
  ON public.crowdsense_weekly (week_start, rating DESC, adjusted_accuracy DESC, scored_count DESC)
  WHERE qualified;

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
        row_number() OVER (
          ORDER BY w.rating DESC, w.adjusted_accuracy DESC, w.scored_count DESC, p.username ASC
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
        row_number() OVER (
          ORDER BY r.rating DESC, r.adjusted_accuracy DESC, r.scored_count DESC, p.username ASC
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
        row_number() OVER (
          ORDER BY r.rating DESC, r.adjusted_accuracy DESC, r.scored_count DESC, p.username ASC
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

REVOKE ALL ON FUNCTION public.get_leaderboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO anon, authenticated;
