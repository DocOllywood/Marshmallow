-- Grants, RLS, and realtime publication hygiene.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, onboarding_completed_at) ON public.profiles TO authenticated;

GRANT SELECT ON public.topics TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_topic_prefs TO authenticated;

GRANT SELECT ON public.marshmallows TO anon, authenticated;
GRANT SELECT ON public.marshmallow_choices TO anon, authenticated;

GRANT SELECT, INSERT ON public.entries TO authenticated;
GRANT UPDATE (own_choice_id, draft_updated_at, idempotency_key) ON public.entries TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_allocations TO authenticated;

GRANT SELECT ON public.marshmallow_results TO anon, authenticated;
GRANT SELECT ON public.marshmallow_result_choices TO anon, authenticated;
GRANT SELECT ON public.scores TO authenticated;
GRANT SELECT ON public.reveal_opens TO authenticated;
GRANT SELECT ON public.share_cards TO authenticated;
GRANT SELECT ON public.streaks TO authenticated;

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, UPDATE (read_at) ON public.notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_valid_username(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reveal_bonus_points(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_revealed(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seal_entry(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_reveal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marshmallow_results(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_share_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_marshmallow(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.new_share_public_id() TO service_role;

ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshmallows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshmallow_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshmallow_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshmallow_result_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reveal_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_public
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY streaks_select_own
  ON public.streaks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY topics_select_active
  ON public.topics FOR SELECT
  TO anon, authenticated
  USING (active OR public.is_staff());

CREATE POLICY user_topic_prefs_own
  ON public.user_topic_prefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY marshmallows_select_visible
  ON public.marshmallows FOR SELECT
  TO anon, authenticated
  USING (status <> 'draft' OR public.is_admin());

CREATE POLICY marshmallow_choices_select_visible
  ON public.marshmallow_choices FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marshmallows m
      WHERE m.id = marshmallow_id
        AND (m.status <> 'draft' OR public.is_admin())
    )
  );

CREATE POLICY entries_select_own
  ON public.entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY entries_insert_own
  ON public.entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND sealed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.marshmallows m
      WHERE m.id = marshmallow_id
        AND m.status = 'open'
        AND now() < m.closes_at
    )
  );

CREATE POLICY entries_update_own_draft
  ON public.entries FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND sealed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.marshmallows m
      WHERE m.id = marshmallow_id
        AND m.status = 'open'
        AND now() < m.closes_at
    )
  )
  WITH CHECK (user_id = auth.uid() AND sealed_at IS NULL);

CREATE POLICY entry_allocations_own
  ON public.entry_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      WHERE e.id = entry_id
        AND e.user_id = auth.uid()
        AND e.sealed_at IS NULL
        AND m.status = 'open'
        AND now() < m.closes_at
    )
  );

CREATE POLICY marshmallow_results_select_revealed
  ON public.marshmallow_results FOR SELECT
  TO anon, authenticated
  USING (public.is_revealed(marshmallow_id));

CREATE POLICY marshmallow_result_choices_select_revealed
  ON public.marshmallow_result_choices FOR SELECT
  TO anon, authenticated
  USING (public.is_revealed(marshmallow_id));

CREATE POLICY scores_select_own_revealed
  ON public.scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_revealed(marshmallow_id));

CREATE POLICY reveal_opens_select_own
  ON public.reveal_opens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY share_cards_select_own
  ON public.share_cards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY reports_insert_own
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY reports_select_own_or_staff
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff());

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update, delete, truncate');
  END IF;
END;
$$;
