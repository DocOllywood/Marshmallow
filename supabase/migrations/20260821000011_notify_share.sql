-- Reveal-ready notifications, email outbox, share privacy RPCs, growth metrics.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_reveal_ready_once
  ON public.notifications (user_id, marshmallow_id)
  WHERE type = 'reveal_ready';

CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_reveal_ready boolean NOT NULL DEFAULT false,
  email_daily boolean NOT NULL DEFAULT false,
  email_streak boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_prefs_set_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_profiles_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_profiles_notification_prefs();

INSERT INTO public.notification_prefs (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL,
  notification_id uuid REFERENCES public.notifications (id) ON DELETE SET NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider text,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (user_id, marshmallow_id, template)
);

CREATE INDEX email_outbox_pending_idx
  ON public.email_outbox (created_at)
  WHERE status = 'pending';

CREATE TABLE public.share_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL REFERENCES public.share_cards (public_id) ON DELETE CASCADE,
  visitor_token text NOT NULL CHECK (visitor_token ~ '^[a-f0-9]{32}$'),
  play_clicked_at timestamptz,
  signup_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_id, visitor_token)
);

CREATE INDEX share_visits_public_id_idx ON public.share_visits (public_id);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_visits ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE (email_reveal_ready, email_daily, email_streak) ON public.notification_prefs TO authenticated;
GRANT SELECT ON public.email_outbox TO authenticated;

CREATE POLICY notification_prefs_select_own
  ON public.notification_prefs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_prefs_update_own
  ON public.notification_prefs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY email_outbox_select_own
  ON public.email_outbox FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enqueue_reveal_ready_notifications(p_marshmallow_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.marshmallows%ROWTYPE;
  v_votes int := 0;
  v_inserted int := 0;
BEGIN
  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_m.status IS DISTINCT FROM 'revealed' OR v_m.cancelled_at IS NOT NULL THEN
    RETURN 0;
  END IF;
  IF NOT public.is_revealed(p_marshmallow_id) THEN
    RETURN 0;
  END IF;

  SELECT coalesce(total_sealed_votes, 0) INTO v_votes
  FROM public.marshmallow_results
  WHERE marshmallow_id = p_marshmallow_id;

  IF v_votes <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, marshmallow_id, payload)
  SELECT
    e.user_id,
    'reveal_ready',
    p_marshmallow_id,
    jsonb_build_object(
      'href', '/m/' || p_marshmallow_id::text || '?from=notify'
    )
  FROM public.entries e
  WHERE e.marshmallow_id = p_marshmallow_id
    AND e.sealed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.reveal_opens ro
      WHERE ro.user_id = e.user_id AND ro.marshmallow_id = p_marshmallow_id
    )
  ON CONFLICT (user_id, marshmallow_id) WHERE type = 'reveal_ready' DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO public.email_outbox (user_id, marshmallow_id, notification_id, template)
  SELECT n.user_id, n.marshmallow_id, n.id, 'reveal_ready'
  FROM public.notifications n
  JOIN public.notification_prefs p ON p.user_id = n.user_id
  WHERE n.marshmallow_id = p_marshmallow_id
    AND n.type = 'reveal_ready'
    AND p.email_reveal_ready
  ON CONFLICT (user_id, marshmallow_id, template) DO NOTHING;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_marshmallow_revealed_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'revealed'
     AND OLD.status IS DISTINCT FROM 'revealed'
     AND NEW.cancelled_at IS NULL THEN
    PERFORM public.enqueue_reveal_ready_notifications(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER marshmallows_revealed_notify
  AFTER UPDATE OF status ON public.marshmallows
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_marshmallow_revealed_notify();

CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_limit integer DEFAULT 20)
RETURNS SETOF public.email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM public.email_outbox
    WHERE status IN ('pending', 'sending')
      AND attempts < 8
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 100))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_outbox o
  SET attempts = o.attempts + 1,
      status = 'sending'
  FROM picked
  WHERE o.id = picked.id
  RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_reveal_ready_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_reveal_ready_notifications(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.claim_email_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.create_share_card(p_marshmallow_id uuid)
RETURNS public.share_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card public.share_cards%ROWTYPE;
  v_public_id text;
  v_m public.marshmallows%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_card
  FROM public.share_cards
  WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;

  IF FOUND THEN
    RETURN v_card;
  END IF;

  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  IF v_m.status = 'cancelled' OR v_m.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'marshmallow_cancelled';
  END IF;
  IF NOT public.is_revealed(p_marshmallow_id) THEN
    RAISE EXCEPTION 'results_not_available';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entries
    WHERE user_id = v_user_id
      AND marshmallow_id = p_marshmallow_id
      AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'no_sealed_entry';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reveal_opens
    WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id
  ) THEN
    RAISE EXCEPTION 'reveal_not_opened';
  END IF;

  BEGIN
    LOOP
      v_public_id := public.new_share_public_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.share_cards WHERE public_id = v_public_id);
    END LOOP;

    INSERT INTO public.share_cards (public_id, user_id, marshmallow_id)
    VALUES (v_public_id, v_user_id, p_marshmallow_id)
    RETURNING * INTO v_card;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_card
    FROM public.share_cards
    WHERE user_id = v_user_id AND marshmallow_id = p_marshmallow_id;
    RETURN v_card;
  END;

  PERFORM public.record_product_event(v_user_id, p_marshmallow_id, 'share_created', '{}'::jsonb);
  RETURN v_card;
END;
$$;

REVOKE ALL ON FUNCTION public.create_share_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_share_card(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_share(p_public_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_card public.share_cards%ROWTYPE;
  v_m public.marshmallows%ROWTYPE;
  v_score public.scores%ROWTYPE;
  v_entry public.entries%ROWTYPE;
  v_results jsonb;
  v_preds jsonb;
BEGIN
  IF p_public_id IS NULL OR p_public_id !~ '^[a-f0-9]{32}$' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_card FROM public.share_cards WHERE public_id = p_public_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_m FROM public.marshmallows WHERE id = v_card.marshmallow_id;
  IF NOT FOUND
     OR v_m.status = 'cancelled'
     OR v_m.cancelled_at IS NOT NULL
     OR NOT public.is_revealed(v_m.id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_score
  FROM public.scores
  WHERE user_id = v_card.user_id AND marshmallow_id = v_card.marshmallow_id;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE user_id = v_card.user_id AND marshmallow_id = v_card.marshmallow_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'label', c.label,
    'sort_order', c.sort_order,
    'vote_pct', rc.vote_pct,
    'you_pct', a.predicted_pct
  ) ORDER BY c.sort_order), '[]'::jsonb)
  INTO v_results
  FROM public.marshmallow_choices c
  JOIN public.marshmallow_result_choices rc
    ON rc.choice_id = c.id AND rc.marshmallow_id = c.marshmallow_id
  LEFT JOIN public.entry_allocations a
    ON a.choice_id = c.id AND a.entry_id = v_entry.id
  WHERE c.marshmallow_id = v_m.id;

  SELECT jsonb_build_object(
    'choice_label', oc.label,
    'predicted_pct', ea.predicted_pct
  )
  INTO v_preds
  FROM public.marshmallow_choices oc
  LEFT JOIN public.entry_allocations ea
    ON ea.choice_id = oc.id AND ea.entry_id = v_entry.id
  WHERE oc.id = v_entry.own_choice_id;

  RETURN jsonb_build_object(
    'public_id', v_card.public_id,
    'question', v_m.question,
    'accuracy', v_score.accuracy,
    'own_choice', v_preds,
    'choices', v_results,
    'total_votes', (SELECT total_sealed_votes FROM public.marshmallow_results WHERE marshmallow_id = v_m.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_share_visit(p_public_id text, p_visitor_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_public_id IS NULL OR p_public_id !~ '^[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'share_invalid';
  END IF;
  IF p_visitor_token IS NULL OR p_visitor_token !~ '^[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'visitor_invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.share_cards sc
    JOIN public.marshmallows m ON m.id = sc.marshmallow_id
    WHERE sc.public_id = p_public_id
      AND public.is_revealed(m.id)
      AND m.cancelled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'share_invalid';
  END IF;

  INSERT INTO public.share_visits (public_id, visitor_token)
  VALUES (p_public_id, p_visitor_token)
  ON CONFLICT (public_id, visitor_token) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_share_play(p_public_id text, p_visitor_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.share_visits
  SET play_clicked_at = coalesce(play_clicked_at, now())
  WHERE public_id = p_public_id AND visitor_token = p_visitor_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.attribute_share_signup(p_public_id text, p_visitor_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.share_visits
  SET signup_user_id = coalesce(signup_user_id, v_uid)
  WHERE public_id = p_public_id AND visitor_token = p_visitor_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_share_visit(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_share_visit(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_share_play(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_share_play(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.attribute_share_signup(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attribute_share_signup(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_growth_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notify int;
  v_opens_after int;
  v_median numeric;
  v_visitors int;
  v_plays int;
  v_signups int;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*)::int INTO v_notify
  FROM public.notifications
  WHERE type = 'reveal_ready';

  SELECT count(*)::int INTO v_opens_after
  FROM public.notifications n
  JOIN public.reveal_opens ro
    ON ro.user_id = n.user_id AND ro.marshmallow_id = n.marshmallow_id
  WHERE n.type = 'reveal_ready'
    AND ro.opened_at >= n.created_at;

  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (ro.opened_at - n.created_at))
  )
  INTO v_median
  FROM public.notifications n
  JOIN public.reveal_opens ro
    ON ro.user_id = n.user_id AND ro.marshmallow_id = n.marshmallow_id
  WHERE n.type = 'reveal_ready'
    AND ro.opened_at >= n.created_at;

  SELECT count(*)::int INTO v_visitors FROM public.share_visits;
  SELECT count(*)::int INTO v_plays
  FROM public.share_visits WHERE play_clicked_at IS NOT NULL;
  SELECT count(*)::int INTO v_signups
  FROM public.share_visits WHERE signup_user_id IS NOT NULL;

  RETURN jsonb_build_object(
    'reveal_ready_created', v_notify,
    'reveal_opens_after_notification', v_opens_after,
    'median_notify_to_open_seconds', v_median,
    'share_visitors', v_visitors,
    'share_play_clicks', v_plays,
    'share_signups', v_signups,
    'share_play_rate', CASE WHEN v_visitors = 0 THEN NULL ELSE round(v_plays::numeric / v_visitors, 4) END,
    'share_signup_rate', CASE WHEN v_visitors = 0 THEN NULL ELSE round(v_signups::numeric / v_visitors, 4) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_growth_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_growth_metrics() TO authenticated;

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
    'notification_clicked'
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
