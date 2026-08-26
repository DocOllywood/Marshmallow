-- Beta Daily product events for pre-launch testing.

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
    'next_daily_return'
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
