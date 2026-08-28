-- Draft Blind Mirror QA experiment: same principle as Loyalty vs Justice, family context.
-- Direct-URL QA only — NOT promoted to public Daily.

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
  v_round_id uuid := '40000000-0000-4000-8000-000000000007';
  v_round_date date := '2026-10-13';
  v_principle_id uuid := '60000000-0000-4000-8000-000000000001';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000011';
BEGIN
  SELECT id INTO v_topic FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    v_round_id,
    v_round_date,
    'When does family loyalty end?',
    'One secret. Four changes. See where your rule bends.',
    v_topic,
    v_tension_id,
    v_principle_id,
    'draft',
    '{"experiment":{"version":1},"context":{"subject":"family","label":"YOUR SIBLING"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    topic_id = EXCLUDED.topic_id,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        (
          '31000000-0000-4000-8000-000000000030'::uuid,
          '31000000-0000-4000-8000-000000000301'::uuid,
          '31000000-0000-4000-8000-000000000302'::uuid,
          v_round_id,
          1::smallint,
          'You discover your sibling has been taking credit for a coworker''s project—the work that would earn the promotion. The coworker is about to be passed over. Do you tell them?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"instinct","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000031'::uuid,
          '31000000-0000-4000-8000-000000000311'::uuid,
          '31000000-0000-4000-8000-000000000312'::uuid,
          v_round_id,
          2::smallint,
          'It happened once. Your sibling says they exaggerated one meeting and have already stopped. They''ll make it right quietly. What do you do now?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"pressure","pressure_type":"REMORSE","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000032'::uuid,
          '31000000-0000-4000-8000-000000000321'::uuid,
          '31000000-0000-4000-8000-000000000322'::uuid,
          v_round_id,
          3::smallint,
          'Your sibling asks you to sit with the family at the office holiday party—the first time the coworker will be there since this could come out. If you stay silent, you help your sibling get through the night. If you speak up now, you stop it. What now?'::text,
          'Tell them'::text,
          'Stay silent'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"consequence","pressure_type":"COMPLICITY","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000033'::uuid,
          '31000000-0000-4000-8000-000000000331'::uuid,
          '31000000-0000-4000-8000-000000000332'::uuid,
          v_round_id,
          4::smallint,
          'Imagine you are the coworker. Your colleague''s sibling knows what happened. Would you want them to tell you?'::text,
          'Yes'::text,
          'No'::text,
          'right'::text,
          'left'::text,
          '{"experiment":{"stage":"flip","pressure_type":"PERSPECTIVE","requires_prediction":true}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000034'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'When does staying silent become participating in the wrong?'::text,
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
    IF rec.position = 5 THEN
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
        daily_round_id = EXCLUDED.daily_round_id,
        round_position = EXCLUDED.round_position,
        daily_on = EXCLUDED.daily_on,
        is_line = true,
        metadata = EXCLUDED.metadata,
        status = 'draft';

      INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
        ('31000000-0000-4000-8000-000000000341', rec.id, 'The moment I know', 0, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000342', rec.id, 'If it happens again', 1, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000343', rec.id, 'If it keeps happening', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000344', rec.id, 'Only if they''re asked directly', 3, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000345', rec.id, 'Never — it isn''t my place', 4, '{"tension_side":"left"}'::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order,
        metadata = EXCLUDED.metadata;

      CONTINUE;
    END IF;

    DELETE FROM public.marshmallow_choices WHERE marshmallow_id = rec.id;

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
      daily_round_id = EXCLUDED.daily_round_id,
      round_position = EXCLUDED.round_position,
      daily_on = EXCLUDED.daily_on,
      metadata = EXCLUDED.metadata,
      status = 'draft';

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
  v_round_id uuid := '40000000-0000-4000-8000-000000000007';
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
