-- Hosted-safe fictional seed. No auth.users inserts.
-- Idempotent: safe to re-run after migrations.

INSERT INTO public.topics (id, kind, parent_id, name, slug, active) VALUES
  ('20000000-0000-4000-8000-000000000001', 'category', NULL, 'Pop Culture', 'pop-culture', true),
  ('20000000-0000-4000-8000-000000000002', 'category', NULL, 'Reality TV', 'reality-tv', true),
  ('20000000-0000-4000-8000-000000000006', 'category', NULL, 'Celebrity', 'celebrity', true),
  ('20000000-0000-4000-8000-000000000007', 'category', NULL, 'Internet Culture', 'internet-culture', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  parent_id = EXCLUDED.parent_id,
  active = true;

INSERT INTO public.topics (id, kind, parent_id, name, slug, active) VALUES
  ('20000000-0000-4000-8000-000000000003', 'show', '20000000-0000-4000-8000-000000000002', 'Island Heat', 'island-heat', true),
  ('20000000-0000-4000-8000-000000000004', 'celebrity', '20000000-0000-4000-8000-000000000006', 'Aria Quinn', 'aria-quinn', true),
  ('20000000-0000-4000-8000-000000000005', 'event', '20000000-0000-4000-8000-000000000002', 'Fall Finale Week', 'fall-finale-week', true),
  ('20000000-0000-4000-8000-000000000008', 'fandom', '20000000-0000-4000-8000-000000000002', 'Villa Watch', 'villa-watch', true),
  ('20000000-0000-4000-8000-000000000009', 'fandom', '20000000-0000-4000-8000-000000000001', 'Late Night Bits', 'late-night-bits', true),
  ('20000000-0000-4000-8000-00000000000a', 'fandom', '20000000-0000-4000-8000-000000000007', 'Meme Court', 'meme-court', true),
  ('20000000-0000-4000-8000-00000000000b', 'fandom', '20000000-0000-4000-8000-000000000006', 'Red Carpet Watch', 'red-carpet-watch', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  parent_id = EXCLUDED.parent_id,
  active = true;

-- Open Daily, 2 choices
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, status, is_daily, daily_on, created_by
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'Who does America think won the argument?',
  '20000000-0000-4000-8000-000000000002',
  now() - interval '1 hour',
  now() + interval '12 hours',
  now() + interval '18 hours',
  'draft',
  true,
  (timezone('utc', now()))::date,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  topic_id = EXCLUDED.topic_id,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  reveals_at = EXCLUDED.reveals_at,
  is_daily = EXCLUDED.is_daily,
  daily_on = EXCLUDED.daily_on,
  status = 'draft';

INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Alex', 0),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Jordan', 1)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

UPDATE public.marshmallows SET status = 'open' WHERE id = '10000000-0000-4000-8000-000000000001';

-- Scheduled, 3 choices
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, status, is_daily, daily_on, created_by
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  'Which snack disappears first at the reunion?',
  '20000000-0000-4000-8000-000000000003',
  now() + interval '1 day',
  now() + interval '2 days',
  now() + interval '2 days 6 hours',
  'draft',
  false,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  topic_id = EXCLUDED.topic_id,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  reveals_at = EXCLUDED.reveals_at,
  status = 'draft';

INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Chips', 0),
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Cookies', 1),
  ('11000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Fruit tray', 2)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

UPDATE public.marshmallows SET status = 'scheduled' WHERE id = '10000000-0000-4000-8000-000000000002';

-- Closed, 4 choices
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, status, is_daily, daily_on, created_by
) VALUES (
  '10000000-0000-4000-8000-000000000003',
  'What was the group chat really about?',
  '20000000-0000-4000-8000-000000000001',
  now() - interval '2 days',
  now() - interval '2 hours',
  now() + interval '6 hours',
  'draft',
  false,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  topic_id = EXCLUDED.topic_id,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  reveals_at = EXCLUDED.reveals_at,
  status = 'draft';

INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
  ('11000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'The vote', 0),
  ('11000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003', 'The kiss', 1),
  ('11000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', 'The twist', 2),
  ('11000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 'Nothing', 3)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

UPDATE public.marshmallows SET status = 'closed' WHERE id = '10000000-0000-4000-8000-000000000003';

-- Revealed, 2 choices
INSERT INTO public.marshmallows (
  id, question, topic_id, opens_at, closes_at, reveals_at, status, is_daily, daily_on, created_by
) VALUES (
  '10000000-0000-4000-8000-000000000004',
  'Who went home first in the fans'' minds?',
  '20000000-0000-4000-8000-000000000005',
  now() - interval '5 days',
  now() - interval '3 days',
  now() - interval '2 days',
  'draft',
  false,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  topic_id = EXCLUDED.topic_id,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  reveals_at = EXCLUDED.reveals_at,
  status = 'draft';

INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
  ('11000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'Riley', 0),
  ('11000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000004', 'Sam', 1)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

UPDATE public.marshmallows SET status = 'closed' WHERE id = '10000000-0000-4000-8000-000000000004';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.marshmallow_results
    WHERE marshmallow_id = '10000000-0000-4000-8000-000000000004'
  ) THEN
    UPDATE public.marshmallows
    SET status = 'revealed'
    WHERE id = '10000000-0000-4000-8000-000000000004';
  ELSE
    PERFORM public.finalize_marshmallow('10000000-0000-4000-8000-000000000004');
  END IF;
END;
$$;
