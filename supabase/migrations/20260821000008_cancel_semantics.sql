-- Cancelled Marshmallows never auto-finalize. Reason lives in admin_audit_log only.

ALTER TABLE public.marshmallows
  DROP CONSTRAINT IF EXISTS marshmallows_cancelled_consistency;

ALTER TABLE public.marshmallows
  ADD CONSTRAINT marshmallows_cancelled_consistency CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
    OR
    (status <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL)
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
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_enforce_published_choice_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_status public.marshmallow_status;
  v_count int;
BEGIN
  IF TG_TABLE_NAME = 'marshmallows' THEN
    v_id := NEW.id;
    v_status := NEW.status;
  ELSE
    v_id := COALESCE(NEW.marshmallow_id, OLD.marshmallow_id);
    SELECT status INTO v_status FROM public.marshmallows WHERE id = v_id;
  END IF;

  IF v_status IN ('scheduled', 'open', 'closed', 'cancelled', 'revealed', 'archived') THEN
    SELECT count(*) INTO v_count
    FROM public.marshmallow_choices
    WHERE marshmallow_id = v_id;
    IF v_count < 2 OR v_count > 4 THEN
      RAISE EXCEPTION 'published_marshmallow_needs_2_to_4_choices';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_emergency_close(p_id uuid, p_reason text)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid;
  v_row public.marshmallows%ROWTYPE;
  v_previous public.marshmallow_status;
  v_reason text := left(trim(p_reason), 500);
BEGIN
  v_admin := public.assert_admin();
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT * INTO v_row FROM public.marshmallows WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  IF v_row.status NOT IN ('scheduled', 'open') THEN
    RAISE EXCEPTION 'emergency_close_not_applicable';
  END IF;

  v_previous := v_row.status;

  UPDATE public.marshmallows
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_admin
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.write_admin_audit(
    'emergency_closed',
    v_row.id,
    jsonb_build_object(
      'reason', v_reason,
      'previous_status', v_previous,
      'cancelled_at', v_row.cancelled_at
    )
  );
  RETURN v_row;
END;
$$;

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
      AND reveals_at <= now()
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
  END LOOP;

  UPDATE public.marshmallows
  SET status = 'revealed'
  WHERE id = p_marshmallow_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_marshmallow(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_marshmallow(uuid) TO service_role;

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

REVOKE ALL ON FUNCTION public.save_entry_draft(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_entry_draft(uuid, uuid, jsonb) TO authenticated;

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
    'waiting_returned'
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
