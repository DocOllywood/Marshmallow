-- Draft experiment Daily: LOYALTY vs. JUSTICE · Human Nature.
-- Direct-URL QA only — does NOT promote to today's public Daily.

INSERT INTO public.human_tensions (id, slug, left_label, right_label, display_label, description, active)
VALUES (
  '50000000-0000-4000-8000-000000000011',
  'loyalty-justice',
  'LOYALTY',
  'JUSTICE',
  'LOYALTY vs. JUSTICE',
  'When loyalty to someone close conflicts with fairness or truth toward the person affected.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  left_label = EXCLUDED.left_label,
  right_label = EXCLUDED.right_label,
  display_label = EXCLUDED.display_label,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
  v_round_id uuid := '40000000-0000-4000-8000-000000000006';
  v_round_date date := '2026-09-22';
BEGIN
  INSERT INTO public.daily_rounds (id, round_date, title, subtitle, topic_id, tension_id, status, metadata)
  VALUES (
    v_round_id,
    v_round_date,
    'How much does loyalty excuse?',
    'One secret. Four changes. See where your rule bends.',
    (SELECT id FROM public.topics WHERE slug = 'human-nature' LIMIT 1),
    '50000000-0000-4000-8000-000000000011',
    'draft',
    '{"experiment":{"version":1}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    topic_id = EXCLUDED.topic_id,
    tension_id = EXCLUDED.tension_id,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        (
          '31000000-0000-4000-8000-000000000020'::uuid,
          '31000000-0000-4000-8000-000000000201'::uuid,
          '31000000-0000-4000-8000-000000000202'::uuid,
          v_round_id,
          1::smallint,
          'Your best friend tells you they cheated on their spouse. Their spouse is also your friend. Do you tell them?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"instinct","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000021'::uuid,
          '31000000-0000-4000-8000-000000000211'::uuid,
          '31000000-0000-4000-8000-000000000212'::uuid,
          v_round_id,
          2::smallint,
          'It happened once. Your friend ended the affair immediately and deeply regrets it. They believe confessing would destroy the marriage. What do you do now?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"pressure","pressure_type":"REMORSE","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000022'::uuid,
          '31000000-0000-4000-8000-000000000221'::uuid,
          '31000000-0000-4000-8000-000000000222'::uuid,
          v_round_id,
          3::smallint,
          'They have two young children. You believe exposing the affair would probably end the marriage and profoundly disrupt their lives. What now?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"consequence","pressure_type":"HARM_TO_OTHERS","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000023'::uuid,
          '31000000-0000-4000-8000-000000000231'::uuid,
          '31000000-0000-4000-8000-000000000232'::uuid,
          v_round_id,
          4::smallint,
          'Imagine you are the spouse. Your partner cheated once. Your mutual friend knows. Would you want your friend to tell you?'::text,
          'Yes'::text,
          'No'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"flip","pressure_type":"PERSPECTIVE","requires_prediction":true}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000024'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'When does staying silent become participating in the betrayal?'::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb
        )
    ) AS seed (
      id, choice_a_id, choice_b_id, round_id, position, question,
      choice_a, choice_b, side_a, side_b, marshmallow_metadata
    )
  LOOP
    SELECT id INTO v_topic FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

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
        is_line, switch_prompt, metadata, created_by
      ) VALUES (
        rec.id, rec.question, v_topic, rec.round_id, rec.position,
        v_now - interval '1 hour', v_now + interval '48 hours',
        v_now + interval '49 hours', v_now + interval '49 hours',
        'draft', true, v_round_date, 'daily', 0,
        true, NULL, rec.marshmallow_metadata, NULL
      )
      ON CONFLICT (id) DO UPDATE SET
        question = EXCLUDED.question,
        topic_id = EXCLUDED.topic_id,
        daily_round_id = EXCLUDED.daily_round_id,
        round_position = EXCLUDED.round_position,
        daily_on = EXCLUDED.daily_on,
        is_line = true,
        is_daily = true,
        play_mode = 'daily',
        switch_prompt = NULL,
        metadata = EXCLUDED.metadata,
        status = 'draft';

      INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
        ('31000000-0000-4000-8000-000000000241', rec.id, 'The moment I know', 0, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000242', rec.id, 'If it happens again', 1, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000243', rec.id, 'If the affair continues', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000244', rec.id, 'Only if they''re asked directly', 3, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000245', rec.id, 'Never — it isn''t my secret', 4, '{"tension_side":"left"}'::jsonb)
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
      switch_prompt, is_line, metadata, created_by
    ) VALUES (
      rec.id, rec.question, v_topic, rec.round_id, rec.position,
      v_now - interval '1 hour', v_now + interval '48 hours',
      v_now + interval '49 hours', v_now + interval '49 hours',
      'draft', true, v_round_date, 'daily', 0,
      NULL, false, rec.marshmallow_metadata, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      question = EXCLUDED.question,
      topic_id = EXCLUDED.topic_id,
      daily_round_id = EXCLUDED.daily_round_id,
      round_position = EXCLUDED.round_position,
      daily_on = EXCLUDED.daily_on,
      switch_prompt = NULL,
      is_line = false,
      is_daily = true,
      play_mode = 'daily',
      metadata = EXCLUDED.metadata,
      status = 'draft';

    DELETE FROM public.marshmallow_choices WHERE marshmallow_id = rec.id;

    INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
      (rec.choice_a_id, rec.id, rec.choice_a, 0, jsonb_build_object('tension_side', rec.side_a)),
      (rec.choice_b_id, rec.id, rec.choice_b, 1, jsonb_build_object('tension_side', rec.side_b))
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata;
  END LOOP;
END $$;

-- Open for direct-URL internal QA without promoting round_date to today.
DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000006';
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
    RETURN;
  END IF;

  UPDATE public.marshmallows
  SET
    status = 'open',
    expires_at = NULL,
    opens_at = v_now - interval '1 hour',
    closes_at = v_now + interval '48 hours',
    reveals_at = v_now + interval '49 hours',
    hard_reveals_at = v_now + interval '49 hours'
  WHERE daily_round_id = v_round_id
    AND status IN ('draft', 'scheduled', 'open', 'closed');
END $$;
