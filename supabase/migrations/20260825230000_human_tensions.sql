-- Human Tensions editorial layer + HONESTY vs. KINDNESS test Daily (future date).

-- ---------------------------------------------------------------------------
-- human_tensions reference table
-- ---------------------------------------------------------------------------

CREATE TABLE public.human_tensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  left_label text NOT NULL,
  right_label text NOT NULL,
  display_label text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT human_tensions_slug_present CHECK (char_length(trim(slug)) > 0),
  CONSTRAINT human_tensions_left_label_present CHECK (char_length(trim(left_label)) > 0),
  CONSTRAINT human_tensions_right_label_present CHECK (char_length(trim(right_label)) > 0),
  CONSTRAINT human_tensions_display_label_present CHECK (char_length(trim(display_label)) > 0)
);

ALTER TABLE public.daily_rounds
  ADD COLUMN IF NOT EXISTS tension_id uuid REFERENCES public.human_tensions (id) ON DELETE SET NULL;

CREATE INDEX daily_rounds_tension_id_idx ON public.daily_rounds (tension_id);

ALTER TABLE public.human_tensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY human_tensions_select_active
  ON public.human_tensions FOR SELECT
  TO authenticated
  USING (active OR public.is_staff());

GRANT SELECT ON public.human_tensions TO authenticated;
GRANT ALL ON public.human_tensions TO service_role;

-- ---------------------------------------------------------------------------
-- Seed core tensions
-- ---------------------------------------------------------------------------

INSERT INTO public.human_tensions (id, slug, left_label, right_label, display_label, description, active) VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    'honesty-kindness',
    'HONESTY',
    'KINDNESS',
    'HONESTY vs. KINDNESS',
    'When telling the truth conflicts with protecting someone''s feelings.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'loyalty-self-preservation',
    'LOYALTY',
    'SELF-PRESERVATION',
    'LOYALTY vs. SELF-PRESERVATION',
    'When standing by someone conflicts with protecting yourself.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'love-freedom',
    'LOVE',
    'FREEDOM',
    'LOVE vs. FREEDOM',
    'When commitment conflicts with independence.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    'trust-privacy',
    'TRUST',
    'PRIVACY',
    'TRUST vs. PRIVACY',
    'When openness conflicts with keeping parts of yourself private.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000005',
    'passion-security',
    'PASSION',
    'SECURITY',
    'PASSION vs. SECURITY',
    'When intensity conflicts with stability.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000006',
    'forgiveness-self-respect',
    'FORGIVENESS',
    'SELF-RESPECT',
    'FORGIVENESS vs. SELF-RESPECT',
    'When letting go conflicts with holding a boundary.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000007',
    'belonging-independence',
    'BELONGING',
    'INDEPENDENCE',
    'BELONGING vs. INDEPENDENCE',
    'When fitting in conflicts with standing apart.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000008',
    'desire-commitment',
    'DESIRE',
    'COMMITMENT',
    'DESIRE vs. COMMITMENT',
    'When wanting more conflicts with what you promised.',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000009',
    'status-authenticity',
    'STATUS',
    'AUTHENTICITY',
    'STATUS vs. AUTHENTICITY',
    'When image conflicts with being fully yourself.',
    true
  ),
  (
    '50000000-0000-4000-8000-00000000000a',
    'truth-peace',
    'TRUTH',
    'PEACE',
    'TRUTH vs. PEACE',
    'When clarity conflicts with keeping the calm.',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  left_label = EXCLUDED.left_label,
  right_label = EXCLUDED.right_label,
  display_label = EXCLUDED.display_label,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

-- Tomorrow's round gets a tension tease (questions unchanged).
UPDATE public.daily_rounds
SET tension_id = '50000000-0000-4000-8000-000000000002'
WHERE id = '40000000-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------
-- Future test Daily: HONESTY vs. KINDNESS (today + 3 UTC)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
  v_round_id uuid := '40000000-0000-4000-8000-000000000004';
  v_round_date date := (timezone('utc', now()))::date + 3;
BEGIN
  INSERT INTO public.daily_rounds (id, round_date, title, subtitle, topic_id, tension_id, status) VALUES
    (
      v_round_id,
      v_round_date,
      'When does honesty become cruelty?',
      'Five dilemmas about truth, care, and what we owe each other.',
      (SELECT id FROM public.topics WHERE slug = 'love' LIMIT 1),
      '50000000-0000-4000-8000-000000000001',
      'draft'
    )
  ON CONFLICT (round_date) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    topic_id = EXCLUDED.topic_id,
    tension_id = EXCLUDED.tension_id,
    status = EXCLUDED.status;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        (
          '31000000-0000-4000-8000-000000000010'::uuid,
          '31000000-0000-4000-8000-000000000101'::uuid,
          '31000000-0000-4000-8000-000000000102'::uuid,
          v_round_id,
          1::smallint,
          'Would you tell your partner if you no longer found them as attractive as you once did?'::text,
          'Yes'::text,
          'No'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000011'::uuid,
          '31000000-0000-4000-8000-000000000111'::uuid,
          '31000000-0000-4000-8000-000000000112'::uuid,
          v_round_id,
          2::smallint,
          'Should your closest friend tell you if they think you''re marrying the wrong person?'::text,
          'Yes, they should'::text,
          'No, stay out of it'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000012'::uuid,
          '31000000-0000-4000-8000-000000000121'::uuid,
          '31000000-0000-4000-8000-000000000122'::uuid,
          v_round_id,
          3::smallint,
          'Would you want to know about a one-time betrayal from ten years ago if it had never happened again?'::text,
          'Yes, tell me'::text,
          'No, leave it buried'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000013'::uuid,
          '31000000-0000-4000-8000-000000000131'::uuid,
          '31000000-0000-4000-8000-000000000132'::uuid,
          v_round_id,
          4::smallint,
          'Would you tell a friend a hard truth about their partner if you knew it could end their relationship?'::text,
          'Yes, tell them'::text,
          'No, protect the peace'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000014'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'When does withholding information become lying?'::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text
        )
    ) AS seed (id, choice_a_id, choice_b_id, round_id, position, question, choice_a, choice_b, side_a, side_b)
  LOOP
    SELECT id INTO v_topic FROM public.topics WHERE slug = 'love' LIMIT 1;

    IF rec.position = 5 THEN
      IF EXISTS (
        SELECT 1 FROM public.entries
        WHERE marshmallow_id = rec.id AND sealed_at IS NOT NULL
      ) THEN
        CONTINUE;
      END IF;

      DELETE FROM public.marshmallow_choices WHERE marshmallow_id = rec.id;

      INSERT INTO public.marshmallows (
        id, question, topic_id, daily_round_id, round_position,
        opens_at, closes_at, reveals_at, hard_reveals_at,
        status, is_daily, daily_on, play_mode, minimum_result_sample,
        is_line, created_by
      ) VALUES (
        rec.id, rec.question, v_topic, rec.round_id, rec.position,
        v_now - interval '1 hour', v_now + interval '12 hours',
        v_now + interval '18 hours', v_now + interval '18 hours',
        'draft', true, v_round_date, 'daily', 0,
        true, NULL
      )
      ON CONFLICT (id) DO UPDATE SET
        question = EXCLUDED.question,
        topic_id = EXCLUDED.topic_id,
        daily_round_id = EXCLUDED.daily_round_id,
        round_position = EXCLUDED.round_position,
        daily_on = EXCLUDED.daily_on,
        is_line = true,
        is_daily = true,
        play_mode = 'daily';

      INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
        ('31000000-0000-4000-8000-000000000141', rec.id, 'Immediately', 0, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000142', rec.id, 'After a few days', 1, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000143', rec.id, 'After a month', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000144', rec.id, 'Only if asked directly', 3, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000145', rec.id, 'Never — some truths stay private', 4, '{"tension_side":"right"}'::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order,
        metadata = EXCLUDED.metadata;

      CONTINUE;
    END IF;

    INSERT INTO public.marshmallows (
      id, question, topic_id, daily_round_id, round_position,
      opens_at, closes_at, reveals_at, hard_reveals_at,
      status, is_daily, daily_on, play_mode, minimum_result_sample,
      switch_prompt, is_line, created_by
    ) VALUES (
      rec.id, rec.question, v_topic, rec.round_id, rec.position,
      v_now - interval '1 hour', v_now + interval '12 hours',
      v_now + interval '18 hours', v_now + interval '18 hours',
      'draft', true, v_round_date, 'daily', 0,
      CASE WHEN rec.position = 4 THEN 'What if your friend would blame you forever if the relationship ended?'::text ELSE NULL END,
      false,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      question = EXCLUDED.question,
      topic_id = EXCLUDED.topic_id,
      daily_round_id = EXCLUDED.daily_round_id,
      round_position = EXCLUDED.round_position,
      daily_on = EXCLUDED.daily_on,
      switch_prompt = EXCLUDED.switch_prompt,
      is_line = false,
      is_daily = true,
      play_mode = 'daily';

    DELETE FROM public.marshmallow_choices WHERE marshmallow_id = rec.id;

    INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
      (
        rec.choice_a_id,
        rec.id,
        rec.choice_a,
        0,
        jsonb_build_object('tension_side', rec.side_a)
      ),
      (
        rec.choice_b_id,
        rec.id,
        rec.choice_b,
        1,
        jsonb_build_object('tension_side', rec.side_b)
      )
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata;
  END LOOP;

  IF v_round_date <= (timezone('utc', now()))::date THEN
    UPDATE public.marshmallows
    SET status = 'open'
    WHERE daily_round_id = v_round_id;

    UPDATE public.daily_rounds
    SET status = 'open'
    WHERE id = v_round_id;
  END IF;
END $$;
