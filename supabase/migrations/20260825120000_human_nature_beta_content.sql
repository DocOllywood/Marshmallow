-- Human Nature beta content: 24 Quick, 1 active Daily, 6 Daily candidates.
-- Idempotent. Preserves sealed history via in-place choice relabeling.

INSERT INTO public.topics (id, kind, parent_id, name, slug, active) VALUES
  ('20000000-0000-4000-8000-000000000101', 'category', NULL, 'Love', 'love', true),
  ('20000000-0000-4000-8000-000000000102', 'category', NULL, 'Happiness', 'happiness', true),
  ('20000000-0000-4000-8000-000000000103', 'category', NULL, 'Morality', 'morality', true),
  ('20000000-0000-4000-8000-000000000104', 'category', NULL, 'Freedom', 'freedom', true),
  ('20000000-0000-4000-8000-000000000105', 'category', NULL, 'Meaning', 'meaning', true),
  ('20000000-0000-4000-8000-000000000106', 'category', NULL, 'Technology', 'technology', true),
  ('20000000-0000-4000-8000-000000000107', 'category', NULL, 'Human Nature', 'human-nature', true),
  ('20000000-0000-4000-8000-000000000108', 'category', NULL, 'Imagination', 'imagination', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  active = true;

CREATE OR REPLACE FUNCTION pg_temp._hn_quick(
  p_id uuid,
  p_question text,
  p_a text,
  p_b text,
  p_priority integer,
  p_topic uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.marshmallows (
    id, question, topic_id, opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, play_mode, minimum_result_sample, quick_priority, created_by
  ) VALUES (
    p_id,
    p_question,
    p_topic,
    v_now - interval '30 minutes',
    v_now + interval '2 hours',
    v_now + interval '2 hours 1 minute',
    v_now + interval '3 hours',
    'draft',
    false,
    'quick',
    5,
    p_priority,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    topic_id = EXCLUDED.topic_id,
    opens_at = EXCLUDED.opens_at,
    closes_at = EXCLUDED.closes_at,
    reveals_at = EXCLUDED.reveals_at,
    hard_reveals_at = EXCLUDED.hard_reveals_at,
    play_mode = 'quick',
    is_daily = false,
    minimum_result_sample = 5,
    quick_priority = EXCLUDED.quick_priority,
    expires_at = NULL,
    status = 'draft';

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 0
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_a
    WHERE marshmallow_id = p_id AND sort_order = 0;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_a, 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 1
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_b
    WHERE marshmallow_id = p_id AND sort_order = 1;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_b, 1);
  END IF;

  UPDATE public.marshmallows SET status = 'open' WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp._hn_daily(
  p_id uuid,
  p_question text,
  p_a text,
  p_b text,
  p_topic uuid,
  p_active boolean,
  p_daily_on date DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := now();
  v_daily_on date := coalesce(p_daily_on, (timezone('utc', v_now))::date);
BEGIN
  INSERT INTO public.marshmallows (
    id, question, topic_id, opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample, created_by
  ) VALUES (
    p_id,
    p_question,
    p_topic,
    v_now - interval '1 hour',
    v_now + interval '12 hours',
    v_now + interval '18 hours',
    v_now + interval '18 hours',
    'draft',
    true,
    v_daily_on,
    'daily',
    0,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    topic_id = EXCLUDED.topic_id,
    opens_at = EXCLUDED.opens_at,
    closes_at = EXCLUDED.closes_at,
    reveals_at = EXCLUDED.reveals_at,
    hard_reveals_at = EXCLUDED.hard_reveals_at,
    is_daily = true,
    daily_on = EXCLUDED.daily_on,
    play_mode = 'daily',
    minimum_result_sample = 0,
    expires_at = NULL,
    status = 'draft';

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 0
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_a
    WHERE marshmallow_id = p_id AND sort_order = 0;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_a, 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 1
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_b
    WHERE marshmallow_id = p_id AND sort_order = 1;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_b, 1);
  END IF;

  IF p_active THEN
    UPDATE public.marshmallows SET status = 'open' WHERE id = p_id;
  ELSE
    UPDATE public.marshmallows SET status = 'draft' WHERE id = p_id;
  END IF;
END;
$$;

-- 24 Quick Marshmallows
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000001', 'Which matters more in a relationship?', 'Being loved', 'Being understood', 1, '20000000-0000-4000-8000-000000000101');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000002', 'Would most people rather have more money or more free time?', 'Money', 'Free time', 2, '20000000-0000-4000-8000-000000000102');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000003', 'Do you think most people are fundamentally good?', 'Yes', 'No', 3, '20000000-0000-4000-8000-000000000107');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000004', 'Would you rather be admired by thousands or truly known by five?', 'Admired', 'Known', NULL, '20000000-0000-4000-8000-000000000108');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000005', 'If you never had to work again, would you still choose to work?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000104');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000006', 'Would you return a wallet with $1,000 if nobody could ever know?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000103');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000007', 'Would you want to know exactly how long you''ll live?', 'Know', 'Never know', NULL, '20000000-0000-4000-8000-000000000105');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000008', 'Would you rather meet your future self or your 10-year-old self?', 'Future self', 'Childhood self', NULL, '20000000-0000-4000-8000-000000000108');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000009', 'Would most people rather talk to animals or speak every human language?', 'Animals', 'Languages', NULL, '20000000-0000-4000-8000-000000000108');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000a', 'Is jealousy mostly about love or mostly about fear?', 'Love', 'Fear', NULL, '20000000-0000-4000-8000-000000000101');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000b', 'Which hurts more: loving someone who doesn''t love you back, or being loved by someone you don''t?', 'Unrequited love', 'Unwanted love', NULL, '20000000-0000-4000-8000-000000000101');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000c', 'Is a small lie to protect someone''s feelings ever okay?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000103');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000d', 'Would you give up your phone for a month if everyone else had to too?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000104');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000e', 'Would you trust an AI to pick your next job?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000106');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-00000000000f', 'Is it worse to be bored or to be stressed?', 'Bored', 'Stressed', NULL, '20000000-0000-4000-8000-000000000102');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000010', 'Would you rather be remembered as kind or as brilliant?', 'Kind', 'Brilliant', NULL, '20000000-0000-4000-8000-000000000105');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000011', 'When most people are wrong, do they change their mind or double down?', 'Change', 'Double down', NULL, '20000000-0000-4000-8000-000000000107');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000012', 'If you could erase one painful memory, would you?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000108');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000013', 'Is staying in a loveless marriage for the kids ever the right call?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000101');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000014', 'Would you take a pill that made you always honest?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000103');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000015', 'Would you live in a perfect simulation if you never knew?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000108');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000016', 'Does social media bring people closer or push them apart?', 'Closer', 'Apart', NULL, '20000000-0000-4000-8000-000000000106');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000017', 'Is a life without struggle still worth living?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000105');
SELECT pg_temp._hn_quick('30000000-0000-4000-8000-000000000018', 'Would you trade half your memories to keep the good ones vivid forever?', 'Yes', 'No', NULL, '20000000-0000-4000-8000-000000000102');

-- Active Daily + 6 candidates (draft)
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d1',
  'Would the world be happier if nobody could become famous?',
  'Yes',
  'No',
  '20000000-0000-4000-8000-000000000107',
  true
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d2',
  'Is it better to have one great love or many small ones?',
  'One great love',
  'Many small loves',
  '20000000-0000-4000-8000-000000000101',
  false,
  ((timezone('utc', now()))::date + 1)
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d3',
  'Would humanity be better off if we could read each other''s thoughts for one day?',
  'Yes',
  'No',
  '20000000-0000-4000-8000-000000000107',
  false,
  ((timezone('utc', now()))::date + 2)
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d4',
  'Is forgiveness more for them or for you?',
  'For them',
  'For you',
  '20000000-0000-4000-8000-000000000103',
  false,
  ((timezone('utc', now()))::date + 3)
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d5',
  'Would you trade five years of life to relive your happiest year once?',
  'Yes',
  'No',
  '20000000-0000-4000-8000-000000000105',
  false,
  ((timezone('utc', now()))::date + 4)
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d6',
  'Are people mostly kind when nobody''s watching?',
  'Yes',
  'No',
  '20000000-0000-4000-8000-000000000107',
  false,
  ((timezone('utc', now()))::date + 5)
);
SELECT pg_temp._hn_daily(
  '30000000-0000-4000-8000-0000000000d7',
  'Is the point of life to be happy or to matter?',
  'Happy',
  'Matter',
  '20000000-0000-4000-8000-000000000105',
  false,
  ((timezone('utc', now()))::date + 6)
);

-- Hide legacy Live beta and any stale beta outside the Human Nature inventory.
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE m.id IN (
  '30000000-0000-4000-8000-0000000000e1',
  '30000000-0000-4000-8000-0000000000e2'
)
AND NOT EXISTS (
  SELECT 1 FROM public.entries e
  WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
);

UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE m.id::text LIKE '30000000-0000-4000-8000-%'
  AND m.id NOT IN (
    SELECT id FROM (
      VALUES
        ('30000000-0000-4000-8000-000000000001'::uuid),
        ('30000000-0000-4000-8000-000000000002'),
        ('30000000-0000-4000-8000-000000000003'),
        ('30000000-0000-4000-8000-000000000004'),
        ('30000000-0000-4000-8000-000000000005'),
        ('30000000-0000-4000-8000-000000000006'),
        ('30000000-0000-4000-8000-000000000007'),
        ('30000000-0000-4000-8000-000000000008'),
        ('30000000-0000-4000-8000-000000000009'),
        ('30000000-0000-4000-8000-00000000000a'),
        ('30000000-0000-4000-8000-00000000000b'),
        ('30000000-0000-4000-8000-00000000000c'),
        ('30000000-0000-4000-8000-00000000000d'),
        ('30000000-0000-4000-8000-00000000000e'),
        ('30000000-0000-4000-8000-00000000000f'),
        ('30000000-0000-4000-8000-000000000010'),
        ('30000000-0000-4000-8000-000000000011'),
        ('30000000-0000-4000-8000-000000000012'),
        ('30000000-0000-4000-8000-000000000013'),
        ('30000000-0000-4000-8000-000000000014'),
        ('30000000-0000-4000-8000-000000000015'),
        ('30000000-0000-4000-8000-000000000016'),
        ('30000000-0000-4000-8000-000000000017'),
        ('30000000-0000-4000-8000-000000000018'),
        ('30000000-0000-4000-8000-0000000000d1'),
        ('30000000-0000-4000-8000-0000000000d2'),
        ('30000000-0000-4000-8000-0000000000d3'),
        ('30000000-0000-4000-8000-0000000000d4'),
        ('30000000-0000-4000-8000-0000000000d5'),
        ('30000000-0000-4000-8000-0000000000d6'),
        ('30000000-0000-4000-8000-0000000000d7')
    ) AS allowed(id)
  )
  AND m.status IN ('open', 'scheduled')
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
  );

-- Expire unplayed dating/pop-culture seed and QA patterns from discovery.
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE (
    m.question ILIKE '%first-date red flag%'
    OR m.question ILIKE '%situationship%'
    OR m.question ILIKE '%breakup%'
    OR m.question ILIKE '%podcast red flag%'
    OR m.question ILIKE '%snack disappears%'
    OR m.question ILIKE '%Who does America think%'
    OR m.question ILIKE '%hurt more to discover%'
    OR m.question ILIKE '%cheated once%'
  )
  AND m.id::text NOT LIKE '30000000-0000-4000-8000-%'
  AND m.status IN ('open', 'scheduled', 'closed')
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
  );
