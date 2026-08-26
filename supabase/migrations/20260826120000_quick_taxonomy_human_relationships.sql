-- Beta 1: retag Quick inventory to canonical Human Relationships worlds.
-- Idempotent. Does not change question text or reopen Quick.

DO $$
DECLARE
  v_love uuid;
  v_friendship uuid;
  v_human_nature uuid;
BEGIN
  SELECT id INTO v_love FROM public.topics WHERE slug = 'love' LIMIT 1;
  SELECT id INTO v_friendship FROM public.topics WHERE slug = 'friendship' LIMIT 1;
  SELECT id INTO v_human_nature FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

  IF v_love IS NULL OR v_friendship IS NULL OR v_human_nature IS NULL THEN
    RAISE EXCEPTION 'canonical_hr_worlds_missing';
  END IF;

  -- Legacy inactive topics → human-nature (Quick beta inventory only).
  UPDATE public.marshmallows m
  SET topic_id = v_human_nature
  FROM public.topics t
  WHERE m.play_mode = 'quick'
    AND m.id::text LIKE '30000000-0000-4000-8000-%'
    AND m.topic_id = t.id
    AND t.slug IN ('happiness', 'freedom', 'meaning', 'technology', 'imagination');

  UPDATE public.marshmallows m
  SET topic_id = v_human_nature
  FROM public.topics t
  WHERE m.play_mode = 'quick'
    AND m.id::text LIKE '30000000-0000-4000-8000-%'
    AND m.topic_id = t.id
    AND t.slug = 'morality'
    AND m.id <> '30000000-0000-4000-8000-00000000000c';

  -- Special cases (approved audit).
  UPDATE public.marshmallows
  SET topic_id = v_friendship
  WHERE id = '30000000-0000-4000-8000-00000000000c';

  UPDATE public.marshmallows
  SET topic_id = v_love
  WHERE play_mode = 'quick'
    AND question = 'Is it ever okay to go through your partner''s phone?';

  UPDATE public.marshmallows
  SET topic_id = v_friendship
  WHERE play_mode = 'quick'
    AND question = 'Would most people stay friends with an ex?';

  -- Non-onboarding active topics used on stray Quick rows.
  UPDATE public.marshmallows m
  SET topic_id = v_love
  FROM public.topics t
  WHERE m.play_mode = 'quick'
    AND m.topic_id = t.id
    AND t.slug = 'dating-relationships';

  UPDATE public.marshmallows m
  SET topic_id = v_friendship
  FROM public.topics t
  WHERE m.play_mode = 'quick'
    AND m.topic_id = t.id
    AND t.slug = 'social-behavior';
END $$;
