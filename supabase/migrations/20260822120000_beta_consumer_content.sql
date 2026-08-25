-- Curated beta consumer content. Expires unplayed QA inventory from discovery.
-- Idempotent: safe to re-run.

INSERT INTO public.topics (id, kind, parent_id, name, slug, active) VALUES
  ('20000000-0000-4000-8000-00000000000c', 'category', NULL, 'Dating & Relationships', 'dating-relationships', true),
  ('20000000-0000-4000-8000-00000000000d', 'category', NULL, 'Social Behavior', 'social-behavior', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  active = true;

-- Hide unplayed non-beta inventory from consumer discovery (sealed history preserved).
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE m.status IN ('open', 'scheduled')
  AND m.id::text NOT LIKE '30000000-0000-4000-8000-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
  );

-- Helper: upsert one binary quick
CREATE OR REPLACE FUNCTION pg_temp._beta_quick(
  p_id uuid,
  p_question text,
  p_a text,
  p_b text,
  p_priority integer,
  p_topic uuid DEFAULT '20000000-0000-4000-8000-00000000000c'
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
    minimum_result_sample = 5,
    quick_priority = EXCLUDED.quick_priority,
    expires_at = NULL,
    status = 'draft';

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = p_id;
  INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order) VALUES
    (p_id, p_a, 0),
    (p_id, p_b, 1);

  UPDATE public.marshmallows SET status = 'open' WHERE id = p_id;
END;
$$;

SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000001',
  'What''s the bigger first-date red flag?',
  'Still obsessed with their ex',
  'Rude to the waiter',
  1
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000002',
  'Which is harder to forgive?',
  'A drunken hookup',
  'An emotional affair',
  2
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000003',
  'Who won the breakup?',
  'The one who moved on first',
  'The one who upgraded',
  3
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000004',
  'Would you rather know your partner cheated once—or never know?',
  'Know',
  'Never know',
  NULL
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000005',
  'What''s worse in a situationship?',
  'They won''t define it',
  'They defined it then backtracked',
  NULL
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000006',
  'Who''s more likely to text back first after a fight?',
  'The one who caused it',
  'The one who cares more',
  NULL
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000007',
  'Which apology feels more sincere?',
  'I''m sorry you feel that way',
  'I messed up',
  NULL
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000008',
  'What kills attraction faster?',
  'Neediness',
  'Emotional unavailability',
  NULL
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-000000000009',
  'Would most people rather be liked or be right online?',
  'Liked',
  'Right',
  NULL,
  '20000000-0000-4000-8000-000000000007'
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-00000000000a',
  'What''s the bigger podcast red flag?',
  'Never admits being wrong',
  'Calls everything ''problematic''',
  NULL,
  '20000000-0000-4000-8000-000000000001'
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-00000000000b',
  'Who gets more sympathy after a public breakup?',
  'The one who posted first',
  'The one who stayed quiet',
  NULL,
  '20000000-0000-4000-8000-00000000000d'
);
SELECT pg_temp._beta_quick(
  '30000000-0000-4000-8000-00000000000c',
  'Which is the bigger friendship betrayal?',
  'Dating your ex',
  'Telling your secret',
  NULL,
  '20000000-0000-4000-8000-00000000000d'
);

-- Daily
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, hard_reveals_at,
  status, is_daily, daily_on, play_mode, minimum_result_sample, created_by
) VALUES (
  '30000000-0000-4000-8000-0000000000d1',
  'Who is the crowd more likely to think reaches out first after a messy breakup?',
  '20000000-0000-4000-8000-00000000000c',
  now() - interval '1 hour',
  now() + interval '12 hours',
  now() + interval '18 hours',
  now() + interval '18 hours',
  'draft',
  true,
  (timezone('utc', now()))::date,
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
  expires_at = NULL,
  status = 'draft';

DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '30000000-0000-4000-8000-0000000000d1';
INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order) VALUES
  ('30000000-0000-4000-8000-0000000000d1', 'The dumper', 0),
  ('30000000-0000-4000-8000-0000000000d1', 'The dumpee', 1);

UPDATE public.marshmallows SET status = 'open' WHERE id = '30000000-0000-4000-8000-0000000000d1';

-- Live examples (open, longer window)
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, hard_reveals_at,
  status, is_daily, play_mode, minimum_result_sample, created_by
) VALUES (
  '30000000-0000-4000-8000-0000000000e1',
  'Is it ever okay to go through your partner''s phone?',
  '20000000-0000-4000-8000-00000000000c',
  now() - interval '30 minutes',
  now() + interval '6 hours',
  now() + interval '6 hours 30 minutes',
  now() + interval '8 hours',
  'draft',
  false,
  'live',
  0,
  NULL
),
(
  '30000000-0000-4000-8000-0000000000e2',
  'Would most people stay friends with an ex?',
  '20000000-0000-4000-8000-00000000000d',
  now() - interval '30 minutes',
  now() + interval '6 hours',
  now() + interval '6 hours 30 minutes',
  now() + interval '8 hours',
  'draft',
  false,
  'live',
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
  play_mode = EXCLUDED.play_mode,
  expires_at = NULL,
  status = 'draft';

DELETE FROM public.marshmallow_choices WHERE marshmallow_id IN (
  '30000000-0000-4000-8000-0000000000e1',
  '30000000-0000-4000-8000-0000000000e2'
);
INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order) VALUES
  ('30000000-0000-4000-8000-0000000000e1', 'Yes, if you suspect something', 0),
  ('30000000-0000-4000-8000-0000000000e1', 'No, never', 1),
  ('30000000-0000-4000-8000-0000000000e2', 'Yes', 0),
  ('30000000-0000-4000-8000-0000000000e2', 'No', 1);

UPDATE public.marshmallows SET status = 'open' WHERE id IN (
  '30000000-0000-4000-8000-0000000000e1',
  '30000000-0000-4000-8000-0000000000e2'
);

-- Retire legacy seed daily from consumer discovery when unplayed.
UPDATE public.marshmallows
SET expires_at = now() - interval '1 hour'
WHERE id = '10000000-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = '10000000-0000-4000-8000-000000000001'
      AND e.sealed_at IS NOT NULL
  );
