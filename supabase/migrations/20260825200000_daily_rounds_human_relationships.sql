-- Daily Rounds + Human Relationships worlds.
-- Preserves historical marshmallows, entries, scores. Hides old worlds from discovery.

-- ---------------------------------------------------------------------------
-- daily_rounds parent
-- ---------------------------------------------------------------------------

CREATE TABLE public.daily_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_date date NOT NULL,
  title text NOT NULL,
  subtitle text,
  topic_id uuid REFERENCES public.topics (id) ON DELETE SET NULL,
  status public.marshmallow_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_rounds_title_present CHECK (char_length(trim(title)) > 0)
);

CREATE UNIQUE INDEX daily_rounds_one_per_utc_date
  ON public.daily_rounds (round_date);

CREATE TRIGGER daily_rounds_set_updated_at
  BEFORE UPDATE ON public.daily_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS daily_round_id uuid REFERENCES public.daily_rounds (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_position smallint;

ALTER TABLE public.marshmallows
  ADD CONSTRAINT marshmallows_round_position_range CHECK (
    round_position IS NULL OR (round_position >= 1 AND round_position <= 5)
  );

CREATE UNIQUE INDEX marshmallows_daily_round_position_unique
  ON public.marshmallows (daily_round_id, round_position)
  WHERE daily_round_id IS NOT NULL AND round_position IS NOT NULL;

DROP INDEX IF EXISTS public.marshmallows_one_daily_per_utc_date;

ALTER TABLE public.daily_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_rounds_select_authenticated
  ON public.daily_rounds FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.daily_rounds TO authenticated;
GRANT ALL ON public.daily_rounds TO service_role;

-- ---------------------------------------------------------------------------
-- Human Relationships worlds (consumer onboarding)
-- ---------------------------------------------------------------------------

INSERT INTO public.topics (id, kind, parent_id, name, slug, active) VALUES
  ('20000000-0000-4000-8000-000000000202', 'category', NULL, 'Friendship', 'friendship', true),
  ('20000000-0000-4000-8000-000000000203', 'category', NULL, 'Dating & Sex', 'dating-sex', true),
  ('20000000-0000-4000-8000-000000000204', 'category', NULL, 'Family', 'family', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = 'category',
  active = true;

UPDATE public.topics
SET active = true, kind = 'category', name = 'Love'
WHERE slug = 'love';

UPDATE public.topics
SET active = true, kind = 'category', name = 'Human Nature'
WHERE slug = 'human-nature';

UPDATE public.topics
SET active = false
WHERE slug IN (
  'happiness', 'morality', 'freedom', 'meaning', 'technology', 'imagination',
  'celebrity', 'reality-tv', 'pop-culture', 'internet-culture'
)
OR kind IN ('celebrity', 'show', 'fandom', 'event');

-- ---------------------------------------------------------------------------
-- Three Daily Rounds (5 questions each) — single DO block for Supabase statement splitting
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
BEGIN
  INSERT INTO public.daily_rounds (id, round_date, title, subtitle, topic_id, status) VALUES
    (
      '40000000-0000-4000-8000-000000000001',
      (timezone('utc', now()))::date,
      'Can love survive complete honesty?',
      '5 questions about love, honesty, and trust.',
      (SELECT id FROM public.topics WHERE slug = 'love' LIMIT 1),
      'open'
    ),
    (
      '40000000-0000-4000-8000-000000000002',
      ((timezone('utc', now()))::date + 1),
      'What do we owe our friends?',
      '5 questions about loyalty, truth, and boundaries.',
      (SELECT id FROM public.topics WHERE slug = 'friendship' LIMIT 1),
      'draft'
    ),
    (
      '40000000-0000-4000-8000-000000000003',
      ((timezone('utc', now()))::date + 2),
      'Do people really want commitment?',
      '5 questions about relationships, freedom, and forever.',
      (SELECT id FROM public.topics WHERE slug = 'dating-sex' LIMIT 1),
      'draft'
    )
  ON CONFLICT (round_date) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    topic_id = EXCLUDED.topic_id,
    status = EXCLUDED.status;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('31000000-0000-4000-8000-000000000001'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 1::smallint,
          'Would you want to know if your partner had once seriously considered leaving you?'::text, 'Yes'::text, 'No'::text, 'love'::text,
          (timezone('utc', now()))::date),
        ('31000000-0000-4000-8000-000000000002'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 2::smallint,
          'Is emotional cheating worse than a drunken kiss?'::text, 'Emotional cheating'::text, 'Drunken kiss'::text, 'love'::text,
          (timezone('utc', now()))::date),
        ('31000000-0000-4000-8000-000000000003'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 3::smallint,
          'Should couples tell each other their exact number of previous sexual partners?'::text, 'Yes'::text, 'No'::text, 'love'::text,
          (timezone('utc', now()))::date),
        ('31000000-0000-4000-8000-000000000004'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 4::smallint,
          'Could you forgive cheating if you knew with certainty it would never happen again?'::text, 'Yes'::text, 'No'::text, 'love'::text,
          (timezone('utc', now()))::date),
        ('31000000-0000-4000-8000-000000000005'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 5::smallint,
          'Would you rather discover your partner cheated once or that they had secretly been unhappy with you for five years?'::text,
          'The affair'::text, 'Five years of unhappiness'::text, 'love'::text, (timezone('utc', now()))::date),
        ('31000000-0000-4000-8000-000000000006'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 1::smallint,
          'Should you tell a friend when their partner is clearly bad for them?'::text, 'Yes'::text, 'No'::text, 'friendship'::text,
          ((timezone('utc', now()))::date + 1)),
        ('31000000-0000-4000-8000-000000000007'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 2::smallint,
          'Is it okay to drift away from a friend who only calls when they need something?'::text, 'Yes'::text, 'No'::text, 'friendship'::text,
          ((timezone('utc', now()))::date + 1)),
        ('31000000-0000-4000-8000-000000000008'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 3::smallint,
          'Would most people stay friends with someone who dated their ex?'::text, 'Yes'::text, 'No'::text, 'friendship'::text,
          ((timezone('utc', now()))::date + 1)),
        ('31000000-0000-4000-8000-000000000009'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 4::smallint,
          'Should friends always tell each other the harsh truth?'::text, 'Yes'::text, 'No'::text, 'friendship'::text,
          ((timezone('utc', now()))::date + 1)),
        ('31000000-0000-4000-8000-00000000000a'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 5::smallint,
          'Would you rather lose a friend over one big fight or slowly stop talking for years?'::text,
          'One big fight'::text, 'Slow fade'::text, 'friendship'::text, ((timezone('utc', now()))::date + 1)),
        ('31000000-0000-4000-8000-00000000000b'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 1::smallint,
          'Would most people rather be single and free or in a relationship that feels safe?'::text,
          'Single and free'::text, 'Safe relationship'::text, 'dating-sex'::text, ((timezone('utc', now()))::date + 2)),
        ('31000000-0000-4000-8000-00000000000c'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 2::smallint,
          'Is "I''m not ready for a relationship" usually honest or an excuse?'::text, 'Honest'::text, 'An excuse'::text, 'dating-sex'::text,
          ((timezone('utc', now()))::date + 2)),
        ('31000000-0000-4000-8000-00000000000d'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 3::smallint,
          'Would you marry someone you love but aren''t fully attracted to?'::text, 'Yes'::text, 'No'::text, 'dating-sex'::text,
          ((timezone('utc', now()))::date + 2)),
        ('31000000-0000-4000-8000-00000000000e'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 4::smallint,
          'Do most people mean it when they say "forever"?'::text, 'Yes'::text, 'No'::text, 'dating-sex'::text,
          ((timezone('utc', now()))::date + 2)),
        ('31000000-0000-4000-8000-00000000000f'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 5::smallint,
          'Would you rather your partner need you too much or not need you enough?'::text,
          'Need me too much'::text, 'Not need me enough'::text, 'dating-sex'::text, ((timezone('utc', now()))::date + 2))
    ) AS seed (id, round_id, position, question, choice_a, choice_b, topic_slug, daily_on)
  LOOP
    SELECT id INTO v_topic FROM public.topics WHERE slug = rec.topic_slug LIMIT 1;

    INSERT INTO public.marshmallows (
      id, question, topic_id, daily_round_id, round_position,
      opens_at, closes_at, reveals_at, hard_reveals_at,
      status, is_daily, daily_on, play_mode, minimum_result_sample, created_by
    ) VALUES (
      rec.id, rec.question, v_topic, rec.round_id, rec.position,
      v_now - interval '1 hour', v_now + interval '12 hours',
      v_now + interval '18 hours', v_now + interval '18 hours',
      'draft', true, rec.daily_on, 'daily', 0, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      question = EXCLUDED.question,
      topic_id = EXCLUDED.topic_id,
      daily_round_id = EXCLUDED.daily_round_id,
      round_position = EXCLUDED.round_position,
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

    IF EXISTS (SELECT 1 FROM public.marshmallow_choices WHERE marshmallow_id = rec.id AND sort_order = 0) THEN
      UPDATE public.marshmallow_choices SET label = rec.choice_a WHERE marshmallow_id = rec.id AND sort_order = 0;
    ELSE
      INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order) VALUES (rec.id, rec.choice_a, 0);
    END IF;

    IF EXISTS (SELECT 1 FROM public.marshmallow_choices WHERE marshmallow_id = rec.id AND sort_order = 1) THEN
      UPDATE public.marshmallow_choices SET label = rec.choice_b WHERE marshmallow_id = rec.id AND sort_order = 1;
    ELSE
      INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order) VALUES (rec.id, rec.choice_b, 1);
    END IF;
  END LOOP;

  UPDATE public.marshmallows SET status = 'open'
  WHERE daily_round_id = '40000000-0000-4000-8000-000000000001';

  UPDATE public.marshmallows m
  SET expires_at = now() - interval '1 hour'
  WHERE m.id = '30000000-0000-4000-8000-0000000000d1'
    AND m.daily_round_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
    );

  UPDATE public.marshmallows m
  SET status = 'draft', expires_at = NULL
  WHERE m.id = '30000000-0000-4000-8000-0000000000d1'
    AND m.daily_round_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
    );
END $$;
