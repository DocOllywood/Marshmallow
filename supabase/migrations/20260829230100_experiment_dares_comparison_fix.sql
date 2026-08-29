-- get_dare_comparison records analytics; must not be STABLE (read-only).

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
