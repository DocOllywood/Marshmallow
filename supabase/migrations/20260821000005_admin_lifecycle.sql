-- Phase 3: SECURITY DEFINER hardening + admin composer RPCs + lifecycle.

-- ---------------------------------------------------------------------------
-- 1. Explicit search_path on every public SECURITY DEFINER function
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.fn);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Least-privilege EXECUTE
-- Internal helpers must not be callable by end users.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.record_product_event(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_daily_play_streak(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_daily_reveal_streak(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allocate_fallback_username(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.new_share_public_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_marshmallow(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_marshmallow(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.new_share_public_id() TO service_role;

-- User-facing definers stay authenticated-only (already granted). Reaffirm.
GRANT EXECUTE ON FUNCTION public.seal_entry(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_reveal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_share_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_product_event(text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marshmallow_results(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. finalize_marshmallow: still not granted to authenticated, but nested
--    calls from run_due_lifecycle (admin JWT) must not be blocked.
--    Premature reveal is still impossible: status/time checks remain.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4. Admin writes via RPC: allow is_admin() through the lifecycle trigger.
--    Ordinary authenticated users remain blocked. Table INSERT/UPDATE
--    policies are still absent — PostgREST cannot write marshmallows.
-- ---------------------------------------------------------------------------

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
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Operational log for lifecycle (not admin impersonation)
-- ---------------------------------------------------------------------------

CREATE TABLE public.lifecycle_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('cron', 'admin')),
  opened_count integer NOT NULL DEFAULT 0,
  closed_count integer NOT NULL DEFAULT 0,
  revealed_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.lifecycle_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.lifecycle_runs TO authenticated;

CREATE POLICY lifecycle_runs_select_admin
  ON public.lifecycle_runs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_audit_log_select_admin
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.admin_audit_log TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Internal audit helper. Actor is always auth.uid(); never a parameter.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.write_admin_audit(
  p_action text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, 'marshmallow', p_entity_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_audit(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_admin() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin composer RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_upsert_marshmallow(
  p_question text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_reveals_at timestamptz,
  p_choices jsonb,
  p_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_is_daily boolean DEFAULT false
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

  IF p_is_daily THEN
    v_daily_on := (p_opens_at AT TIME ZONE 'utc')::date;
  ELSE
    v_daily_on := NULL;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.marshmallows (
      question, topic_id, opens_at, closes_at, reveals_at, status, is_daily, daily_on, created_by
    ) VALUES (
      trim(p_question), p_topic_id, p_opens_at, p_closes_at, p_reveals_at,
      'draft', p_is_daily, v_daily_on, v_admin
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
      is_daily = p_is_daily,
      daily_on = v_daily_on
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
    jsonb_build_object('status', v_row.status, 'is_daily', v_row.is_daily)
  );

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'daily_conflict';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_marshmallow(p_id uuid)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.marshmallows%ROWTYPE;
  v_count int;
BEGIN
  PERFORM public.assert_admin();

  SELECT * INTO v_row FROM public.marshmallows WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  IF v_row.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'marshmallow_locked';
  END IF;
  IF v_row.opens_at >= v_row.closes_at OR v_row.closes_at >= v_row.reveals_at THEN
    RAISE EXCEPTION 'timestamps_invalid';
  END IF;

  SELECT count(*) INTO v_count FROM public.marshmallow_choices WHERE marshmallow_id = p_id;
  IF v_count < 2 OR v_count > 4 THEN
    RAISE EXCEPTION 'choices_invalid';
  END IF;

  IF v_row.topic_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.topics WHERE id = v_row.topic_id AND active
  ) THEN
    RAISE EXCEPTION 'topic_invalid';
  END IF;

  UPDATE public.marshmallows SET status = 'scheduled' WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.write_admin_audit('scheduled', v_row.id, jsonb_build_object('opens_at', v_row.opens_at));
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_emergency_close(p_id uuid, p_reason text)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.marshmallows%ROWTYPE;
  v_previous public.marshmallow_status;
  v_reason text := left(trim(p_reason), 500);
BEGIN
  PERFORM public.assert_admin();
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
  SET status = 'closed',
      closes_at = LEAST(closes_at, now())
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.write_admin_audit(
    'emergency_closed',
    v_row.id,
    jsonb_build_object('reason', v_reason, 'previous_status', v_previous)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_marshmallow(p_id uuid)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.marshmallows%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO v_row FROM public.marshmallows WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  IF v_row.status = 'open' THEN
    RAISE EXCEPTION 'archive_not_applicable';
  END IF;

  UPDATE public.marshmallows SET status = 'archived' WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.write_admin_audit('archived', v_row.id, '{}'::jsonb);
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Lifecycle job — database now(), idempotent, no premature reveal
-- ---------------------------------------------------------------------------

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
    WHERE status = 'closed' AND reveals_at <= now()
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

REVOKE ALL ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_schedule_marshmallow(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_emergency_close(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_archive_marshmallow(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.run_due_lifecycle(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_admin() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_marshmallow(text, timestamptz, timestamptz, timestamptz, jsonb, uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schedule_marshmallow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_emergency_close(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_marshmallow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_due_lifecycle(text) TO authenticated, service_role;
