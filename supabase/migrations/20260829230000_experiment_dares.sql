-- Experiment dares: blind one-to-one daily experiment challenges.

CREATE TABLE public.experiment_dares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.daily_rounds (id) ON DELETE CASCADE,
  sender_line_marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  accepted_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  recipient_line_marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT experiment_dares_token_format CHECK (token ~ '^[a-f0-9]{32}$')
);

CREATE INDEX experiment_dares_sender_idx ON public.experiment_dares (sender_user_id, created_at DESC);
CREATE INDEX experiment_dares_round_idx ON public.experiment_dares (round_id);
CREATE INDEX experiment_dares_token_idx ON public.experiment_dares (token);

CREATE UNIQUE INDEX experiment_dares_sender_round_open
  ON public.experiment_dares (sender_user_id, round_id)
  WHERE cancelled_at IS NULL AND completed_at IS NULL;

ALTER TABLE public.experiment_dares ENABLE ROW LEVEL SECURITY;

CREATE POLICY experiment_dares_select_participant
  ON public.experiment_dares FOR SELECT
  TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR accepted_by_user_id = auth.uid()
  );

-- Writes via SECURITY DEFINER RPCs only.

CREATE OR REPLACE FUNCTION public.user_round_all_sealed(p_user_id uuid, p_round_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*) = 5
  FROM public.marshmallows m
  JOIN public.entries e
    ON e.marshmallow_id = m.id
   AND e.user_id = p_user_id
   AND e.sealed_at IS NOT NULL
  WHERE m.daily_round_id = p_round_id;
$$;

CREATE OR REPLACE FUNCTION public.user_round_line_marshmallow(p_user_id uuid, p_round_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id
  FROM public.marshmallows m
  JOIN public.entries e
    ON e.marshmallow_id = m.id
   AND e.user_id = p_user_id
   AND e.sealed_at IS NOT NULL
  WHERE m.daily_round_id = p_round_id
    AND m.is_line = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.round_playable(p_round_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.marshmallows m
    WHERE m.daily_round_id = p_round_id
      AND m.status <> 'cancelled'
      AND m.cancelled_at IS NULL
      AND m.closes_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.round_experiment_daily(p_round_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (dr.metadata -> 'experiment' ->> 'version') IS NOT NULL
  FROM public.daily_rounds dr
  WHERE dr.id = p_round_id;
$$;

CREATE OR REPLACE FUNCTION public.dare_user_stage_choices(p_user_id uuid, p_round_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'position', m.round_position,
        'stage', coalesce(m.metadata -> 'experiment' ->> 'stage', 'instinct'),
        'choice_label', c.label,
        'is_line', m.is_line,
        'tension_side', coalesce(c.metadata ->> 'tension_side', null),
        'predicted_pct', (
          SELECT ea.predicted_pct
          FROM public.entry_allocations ea
          WHERE ea.entry_id = e.id
            AND ea.choice_id = e.own_choice_id
          LIMIT 1
        )
      )
      ORDER BY m.round_position
    ),
    '[]'::jsonb
  )
  FROM public.marshmallows m
  JOIN public.entries e
    ON e.marshmallow_id = m.id
   AND e.user_id = p_user_id
   AND e.sealed_at IS NOT NULL
  JOIN public.marshmallow_choices c ON c.id = e.own_choice_id
  WHERE m.daily_round_id = p_round_id;
$$;

CREATE OR REPLACE FUNCTION public.create_experiment_dare(p_round_id uuid)
RETURNS public.experiment_dares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dare public.experiment_dares%ROWTYPE;
  v_token text;
  v_line_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.round_experiment_daily(p_round_id) THEN
    RAISE EXCEPTION 'not_experiment_daily';
  END IF;

  IF NOT public.user_round_all_sealed(v_user_id, p_round_id) THEN
    RAISE EXCEPTION 'daily_not_complete';
  END IF;

  IF NOT public.round_playable(p_round_id) THEN
    RAISE EXCEPTION 'round_closed';
  END IF;

  SELECT * INTO v_dare
  FROM public.experiment_dares
  WHERE sender_user_id = v_user_id
    AND round_id = p_round_id
    AND cancelled_at IS NULL
    AND completed_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN v_dare;
  END IF;

  v_line_id := public.user_round_line_marshmallow(v_user_id, p_round_id);
  IF v_line_id IS NULL THEN
    RAISE EXCEPTION 'line_not_found';
  END IF;

  LOOP
    v_token := public.new_share_public_id();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.experiment_dares WHERE token = v_token);
  END LOOP;

  INSERT INTO public.experiment_dares (
    token,
    sender_user_id,
    round_id,
    sender_line_marshmallow_id
  )
  VALUES (v_token, v_user_id, p_round_id, v_line_id)
  RETURNING * INTO v_dare;

  PERFORM public.record_product_event(
    v_user_id,
    v_line_id,
    'dare_created',
    jsonb_build_object('round_id', p_round_id, 'dare_id', v_dare.id)
  );

  RETURN v_dare;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_dare(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dare public.experiment_dares%ROWTYPE;
  v_viewer uuid := auth.uid();
  v_sender_name text;
  v_status text;
  v_play_marshmallow_id uuid;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'dare_not_found';
  END IF;

  SELECT * INTO v_dare FROM public.experiment_dares WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'dare_not_found';
  END IF;

  SELECT coalesce(nullif(trim(p.display_name), ''), p.username)
  INTO v_sender_name
  FROM public.profiles p
  WHERE p.id = v_dare.sender_user_id;

  IF v_dare.cancelled_at IS NOT NULL THEN
    v_status := 'cancelled';
  ELSIF v_dare.completed_at IS NOT NULL THEN
    v_status := 'completed';
  ELSIF NOT public.round_playable(v_dare.round_id) THEN
    v_status := 'closed';
  ELSIF v_dare.accepted_by_user_id IS NOT NULL
        AND v_viewer IS NOT NULL
        AND v_dare.accepted_by_user_id <> v_viewer
        AND v_viewer <> v_dare.sender_user_id THEN
    v_status := 'taken';
  ELSIF v_dare.accepted_by_user_id IS NOT NULL THEN
    v_status := 'claimed';
  ELSE
    v_status := 'open';
  END IF;

  IF v_viewer IS NOT NULL AND v_dare.accepted_by_user_id = v_viewer AND v_status = 'claimed' THEN
    SELECT m.id INTO v_play_marshmallow_id
    FROM public.marshmallows m
    WHERE m.daily_round_id = v_dare.round_id
      AND m.round_position = 1
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'token', v_dare.token,
    'dare_id', v_dare.id,
    'round_id', v_dare.round_id,
    'sender_display_name', v_sender_name,
    'invitation_label', 'A Marshmallow experiment',
    'status', v_status,
    'is_sender', v_viewer IS NOT NULL AND v_viewer = v_dare.sender_user_id,
    'is_recipient', v_viewer IS NOT NULL AND v_viewer = v_dare.accepted_by_user_id,
    'play_marshmallow_id', v_play_marshmallow_id,
    'match_ready', v_dare.completed_at IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_experiment_dare(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dare public.experiment_dares%ROWTYPE;
  v_play_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_dare FROM public.experiment_dares WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'dare_not_found';
  END IF;

  IF v_dare.sender_user_id = v_user_id THEN
    RAISE EXCEPTION 'cannot_dare_self';
  END IF;

  IF v_dare.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'dare_cancelled';
  END IF;

  IF NOT public.round_playable(v_dare.round_id) THEN
    RAISE EXCEPTION 'round_closed';
  END IF;

  IF v_dare.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'dare_already_completed';
  END IF;

  IF v_dare.accepted_by_user_id IS NOT NULL AND v_dare.accepted_by_user_id <> v_user_id THEN
    RAISE EXCEPTION 'dare_already_claimed';
  END IF;

  IF v_dare.accepted_by_user_id IS NULL THEN
    UPDATE public.experiment_dares
    SET accepted_by_user_id = v_user_id,
        accepted_at = now()
    WHERE id = v_dare.id
    RETURNING * INTO v_dare;
  END IF;

  SELECT m.id INTO v_play_id
  FROM public.marshmallows m
  WHERE m.daily_round_id = v_dare.round_id
    AND m.round_position = 1
  LIMIT 1;

  PERFORM public.record_product_event(
    v_user_id,
    v_play_id,
    'dare_accepted',
    jsonb_build_object('round_id', v_dare.round_id, 'dare_id', v_dare.id)
  );

  RETURN jsonb_build_object(
    'token', v_dare.token,
    'round_id', v_dare.round_id,
    'play_marshmallow_id', v_play_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_experiment_dare_for_line(p_line_marshmallow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_dare public.experiment_dares%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.daily_round_id INTO v_round_id
  FROM public.marshmallows m
  WHERE m.id = p_line_marshmallow_id;

  IF v_round_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_dare
  FROM public.experiment_dares
  WHERE round_id = v_round_id
    AND accepted_by_user_id = v_user_id
    AND completed_at IS NULL
    AND cancelled_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT public.user_round_all_sealed(v_user_id, v_round_id) THEN
    RETURN false;
  END IF;

  UPDATE public.experiment_dares
  SET recipient_line_marshmallow_id = p_line_marshmallow_id,
      completed_at = now()
  WHERE id = v_dare.id;

  PERFORM public.record_product_event(
    v_user_id,
    p_line_marshmallow_id,
    'dare_completed',
    jsonb_build_object('round_id', v_round_id, 'dare_id', v_dare.id)
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dare_comparison(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dare public.experiment_dares%ROWTYPE;
  v_sender_name text;
  v_recipient_name text;
  v_viewer_label text;
  v_other_label text;
  v_sender_choices jsonb;
  v_recipient_choices jsonb;
  v_round_revealed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_dare FROM public.experiment_dares WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'dare_not_found';
  END IF;

  IF v_dare.completed_at IS NULL THEN
    RAISE EXCEPTION 'dare_not_complete';
  END IF;

  IF v_user_id <> v_dare.sender_user_id AND v_user_id <> v_dare.accepted_by_user_id THEN
    RAISE EXCEPTION 'dare_forbidden';
  END IF;

  SELECT coalesce(nullif(trim(p.display_name), ''), p.username) INTO v_sender_name
  FROM public.profiles p WHERE p.id = v_dare.sender_user_id;

  SELECT coalesce(nullif(trim(p.display_name), ''), p.username) INTO v_recipient_name
  FROM public.profiles p WHERE p.id = v_dare.accepted_by_user_id;

  IF v_user_id = v_dare.sender_user_id THEN
    v_viewer_label := v_sender_name;
    v_other_label := v_recipient_name;
  ELSE
    v_viewer_label := v_recipient_name;
    v_other_label := v_sender_name;
  END IF;

  v_sender_choices := public.dare_user_stage_choices(v_dare.sender_user_id, v_dare.round_id);
  v_recipient_choices := public.dare_user_stage_choices(v_dare.accepted_by_user_id, v_dare.round_id);

  SELECT NOT EXISTS (
    SELECT 1 FROM public.marshmallows m
    WHERE m.daily_round_id = v_dare.round_id
      AND m.status <> 'revealed'
  ) INTO v_round_revealed;

  PERFORM public.record_product_event(
    v_user_id,
    v_dare.sender_line_marshmallow_id,
    'dare_comparison_viewed',
    jsonb_build_object('round_id', v_dare.round_id, 'dare_id', v_dare.id)
  );

  RETURN jsonb_build_object(
    'token', v_dare.token,
    'dare_id', v_dare.id,
    'round_id', v_dare.round_id,
    'viewer_is_sender', v_user_id = v_dare.sender_user_id,
    'viewer_label', v_viewer_label,
    'other_label', v_other_label,
    'sender_choices', v_sender_choices,
    'recipient_choices', v_recipient_choices,
    'round_revealed', v_round_revealed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sender_dare_for_round(p_round_id uuid)
RETURNS public.experiment_dares
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dare public.experiment_dares%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_dare
  FROM public.experiment_dares
  WHERE sender_user_id = v_user_id
    AND round_id = p_round_id
    AND cancelled_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_dare;
END;
$$;

REVOKE ALL ON FUNCTION public.create_experiment_dare(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_experiment_dare(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_dare(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dare(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_experiment_dare(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_experiment_dare(text) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_experiment_dare_for_line(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_experiment_dare_for_line(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dare_comparison(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dare_comparison(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_sender_dare_for_round(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sender_dare_for_round(uuid) TO authenticated;

-- Dare analytics events
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
    'public_profile_viewed',
    'share_created',
    'share_opened',
    'share_play_clicked',
    'share_signup_started',
    'share_signup_completed',
    'notification_clicked',
    'daily_viewed',
    'daily_started',
    'daily_question_locked',
    'daily_completed',
    'todays_read_viewed',
    'daily_reveal_available',
    'daily_reveal_opened',
    'gap_viewed',
    'next_daily_return',
    'dare_created',
    'dare_link_copied',
    'dare_opened',
    'dare_accepted',
    'dare_completed',
    'dare_comparison_viewed'
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
