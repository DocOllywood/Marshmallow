-- Promoted Quick pool for small beta cohorts.
-- Timestamps and finalize stay authoritative. Priority only affects selection/Home.

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS quick_priority integer;

ALTER TABLE public.marshmallows
  DROP CONSTRAINT IF EXISTS marshmallows_quick_priority_check;
ALTER TABLE public.marshmallows
  ADD CONSTRAINT marshmallows_quick_priority_check
  CHECK (quick_priority IS NULL OR quick_priority >= 0);

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
     OR NEW.entity_label IS DISTINCT FROM OLD.entity_label
     OR NEW.spoiler_context IS DISTINCT FROM OLD.spoiler_context
     OR NEW.image_url IS DISTINCT FROM OLD.image_url
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.quick_priority IS DISTINCT FROM OLD.quick_priority
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refill_promoted_quicks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open int;
  v_next int;
  v_id uuid;
  v_added int := 0;
BEGIN
  SELECT count(*)::int INTO v_open
  FROM public.marshmallows
  WHERE play_mode = 'quick'
    AND status = 'open'
    AND cancelled_at IS NULL
    AND coalesce(quick_priority, 0) > 0;

  WHILE v_open < 3 LOOP
    SELECT id INTO v_id
    FROM public.marshmallows
    WHERE play_mode = 'quick'
      AND status = 'open'
      AND cancelled_at IS NULL
      AND quick_priority IS NULL
    ORDER BY opens_at
    LIMIT 1;
    EXIT WHEN v_id IS NULL;

    SELECT coalesce(max(quick_priority), 0) + 1 INTO v_next
    FROM public.marshmallows
    WHERE play_mode = 'quick' AND coalesce(quick_priority, 0) > 0;

    UPDATE public.marshmallows SET quick_priority = v_next WHERE id = v_id;
    v_open := v_open + 1;
    v_added := v_added + 1;
  END LOOP;
  RETURN v_added;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_refill_promoted_quicks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.play_mode = 'quick'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.refill_promoted_quicks();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marshmallows_refill_promoted ON public.marshmallows;
CREATE TRIGGER marshmallows_refill_promoted
  AFTER UPDATE OF status ON public.marshmallows
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_refill_promoted_quicks();

CREATE OR REPLACE FUNCTION public.admin_set_quick_priority(
  p_id uuid,
  p_priority integer
) RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.marshmallows%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_priority IS NOT NULL AND p_priority < 0 THEN
    SELECT coalesce(max(quick_priority), 0) + 1 INTO p_priority
    FROM public.marshmallows
    WHERE play_mode = 'quick' AND coalesce(quick_priority, 0) > 0;
  END IF;
  UPDATE public.marshmallows
  SET quick_priority = p_priority
  WHERE id = p_id AND play_mode = 'quick'
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  PERFORM public.refill_promoted_quicks();
  SELECT * INTO v_row FROM public.marshmallows WHERE id = p_id;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_promote_next_quick()
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_next int;
  v_row public.marshmallows%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  SELECT id INTO v_id
  FROM public.marshmallows
  WHERE play_mode = 'quick'
    AND status IN ('open', 'scheduled')
    AND cancelled_at IS NULL
    AND coalesce(quick_priority, 0) = 0
  ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END,
           CASE WHEN quick_priority IS NULL THEN 0 ELSE 1 END,
           opens_at
  LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  SELECT coalesce(max(quick_priority), 0) + 1 INTO v_next
  FROM public.marshmallows
  WHERE play_mode = 'quick' AND coalesce(quick_priority, 0) > 0;
  UPDATE public.marshmallows SET quick_priority = v_next WHERE id = v_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

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
  v_promoted int;
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
  SELECT count(*)::int INTO v_promoted
  FROM public.marshmallows
  WHERE play_mode = 'quick' AND status = 'open' AND coalesce(quick_priority, 0) > 0;

  RETURN jsonb_build_object(
    'inventory', jsonb_build_object(
      'open', v_open,
      'cooking', v_cooking,
      'ready', v_ready,
      'promoted_open', v_promoted,
      'promoted_target', 3,
      'warn_below', 5,
      'warning', v_open < 5
    ),
    'eligible_players', v_eligible,
    'board', (
      SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY coalesce(x.quick_priority, 999), x.opens_at), '[]'::jsonb)
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
          m.quick_priority,
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
    ),
    'promoted', jsonb_build_object(
      'revealed', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'quick' AND status = 'revealed' AND coalesce(quick_priority, 0) > 0
      ),
      'views', (
        SELECT count(DISTINCT ev.user_id)::int
        FROM public.product_events ev
        JOIN public.marshmallows m ON m.id = ev.marshmallow_id
        WHERE ev.event_type = 'marshmallow_viewed'
          AND m.play_mode = 'quick' AND coalesce(m.quick_priority, 0) > 0
      ),
      'sealed', (
        SELECT count(*)::int
        FROM public.entries e
        JOIN public.marshmallows m ON m.id = e.marshmallow_id
        WHERE e.sealed_at IS NOT NULL
          AND m.play_mode = 'quick' AND coalesce(m.quick_priority, 0) > 0
      ),
      'median_sample', (
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY r.total_sealed_votes)
        FROM public.marshmallow_results r
        JOIN public.marshmallows m ON m.id = r.marshmallow_id
        WHERE m.play_mode = 'quick' AND m.status = 'revealed' AND coalesce(m.quick_priority, 0) > 0
      ),
      'reached_minimum_before_hard', (
        SELECT count(*)::int
        FROM public.marshmallow_results r
        JOIN public.marshmallows m ON m.id = r.marshmallow_id
        WHERE m.play_mode = 'quick' AND m.status = 'revealed'
          AND coalesce(m.quick_priority, 0) > 0
          AND r.total_sealed_votes >= m.minimum_result_sample
          AND coalesce(m.result_available_at, r.computed_at) < m.hard_reveals_at
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refill_promoted_quicks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refill_promoted_quicks() TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_quick_priority(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_quick_priority(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_promote_next_quick() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_promote_next_quick() TO authenticated;

SELECT public.refill_promoted_quicks();
