-- Onboarding taxonomy, atomic onboarding completion, and analytics RPC.
-- Additive: does not replace Phase 1 schema.

UPDATE public.topics
SET name = 'Pop Culture',
    slug = 'pop-culture',
    kind = 'category',
    parent_id = NULL,
    active = true
WHERE slug IN ('culture', 'pop-culture');

UPDATE public.topics
SET kind = 'category',
    parent_id = NULL,
    active = true
WHERE slug = 'reality-tv';

INSERT INTO public.topics (id, kind, parent_id, name, slug, active)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'category', NULL, 'Pop Culture', 'pop-culture', true),
  ('20000000-0000-4000-8000-000000000002', 'category', NULL, 'Reality TV', 'reality-tv', true),
  ('20000000-0000-4000-8000-000000000006', 'category', NULL, 'Celebrity', 'celebrity', true),
  ('20000000-0000-4000-8000-000000000007', 'category', NULL, 'Internet Culture', 'internet-culture', true)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  active = true;

INSERT INTO public.topics (id, kind, parent_id, name, slug, active)
VALUES
  (
    '20000000-0000-4000-8000-000000000003',
    'show',
    (SELECT id FROM public.topics WHERE slug = 'reality-tv'),
    'Island Heat',
    'island-heat',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'celebrity',
    (SELECT id FROM public.topics WHERE slug = 'celebrity'),
    'Aria Quinn',
    'aria-quinn',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'event',
    (SELECT id FROM public.topics WHERE slug = 'reality-tv'),
    'Fall Finale Week',
    'fall-finale-week',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    'fandom',
    (SELECT id FROM public.topics WHERE slug = 'reality-tv'),
    'Villa Watch',
    'villa-watch',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    'fandom',
    (SELECT id FROM public.topics WHERE slug = 'pop-culture'),
    'Late Night Bits',
    'late-night-bits',
    true
  ),
  (
    '20000000-0000-4000-8000-00000000000a',
    'fandom',
    (SELECT id FROM public.topics WHERE slug = 'internet-culture'),
    'Meme Court',
    'meme-court',
    true
  ),
  (
    '20000000-0000-4000-8000-00000000000b',
    'fandom',
    (SELECT id FROM public.topics WHERE slug = 'celebrity'),
    'Red Carpet Watch',
    'red-carpet-watch',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  active = true;

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_topic_ids uuid[],
  p_display_name text DEFAULT NULL
) RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_top_level int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_missing';
  END IF;

  IF p_topic_ids IS NULL OR cardinality(p_topic_ids) = 0 THEN
    RAISE EXCEPTION 'topics_required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_topic_ids) AS tid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = tid AND t.active
    )
  ) THEN
    RAISE EXCEPTION 'topics_invalid';
  END IF;

  SELECT count(*) INTO v_top_level
  FROM public.topics t
  WHERE t.id = ANY (p_topic_ids)
    AND t.parent_id IS NULL
    AND t.active;

  IF v_top_level < 1 THEN
    RAISE EXCEPTION 'top_level_topic_required';
  END IF;

  DELETE FROM public.user_topic_prefs WHERE user_id = v_user_id;

  INSERT INTO public.user_topic_prefs (user_id, topic_id)
  SELECT DISTINCT v_user_id, tid
  FROM unnest(p_topic_ids) AS tid;

  UPDATE public.profiles
  SET
    display_name = COALESCE(
      NULLIF(trim(p_display_name), ''),
      display_name
    ),
    onboarding_completed_at = COALESCE(onboarding_completed_at, now())
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_product_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_marshmallow_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'shared'
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

REVOKE ALL ON FUNCTION public.complete_onboarding(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.track_product_event(text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_product_event(text, jsonb, uuid) TO authenticated;
