-- Draft Price archetype QA experiment: promise vs escalating offers.
-- Direct-URL QA only — NOT promoted to public Daily.

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000002',
  'promise-vs-gain',
  'Promise versus personal gain',
  'When you promised to keep something, whether an offer can change your mind.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
  v_round_id uuid := '40000000-0000-4000-8000-000000000008';
  v_round_date date := '2026-10-20';
  v_principle_id uuid := '60000000-0000-4000-8000-000000000002';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000008';
BEGIN
  SELECT id INTO v_topic FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    v_round_id,
    v_round_date,
    'Would you sell what you promised to keep?',
    'One promise. Four offers. See where your answer moves.',
    v_topic,
    v_tension_id,
    v_principle_id,
    'draft',
    '{"experiment":{"version":1,"archetype":"price"}}'::jsonb
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
          '31000000-0000-4000-8000-000000000040'::uuid,
          '31000000-0000-4000-8000-000000000401'::uuid,
          '31000000-0000-4000-8000-000000000402'::uuid,
          v_round_id,
          1::smallint,
          'You promised a close friend you would never sell the guitar they gave you — it was their father''s. A collector contacts you privately. Would you sell it?'::text,
          'Keep it'::text,
          'Sell it'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer"}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000041'::uuid,
          '31000000-0000-4000-8000-000000000411'::uuid,
          '31000000-0000-4000-8000-000000000412'::uuid,
          v_round_id,
          2::smallint,
          'The collector''s offer is now $1,000. What do you do?'::text,
          'Keep it'::text,
          'Sell it'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"pressure","pressure_type":"PERSONAL_COST","cost_type":"MONEY","cost_level":1,"cost_label":"$1,000","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000042'::uuid,
          '31000000-0000-4000-8000-000000000421'::uuid,
          '31000000-0000-4000-8000-000000000422'::uuid,
          v_round_id,
          3::smallint,
          'The collector''s offer is now $10,000. What now?'::text,
          'Keep it'::text,
          'Sell it'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"consequence","pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$10,000","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000043'::uuid,
          '31000000-0000-4000-8000-000000000431'::uuid,
          '31000000-0000-4000-8000-000000000432'::uuid,
          v_round_id,
          4::smallint,
          'Imagine you are your friend. They kept your father''s guitar for years, then sold it when the price got high enough. Would you understand?'::text,
          'No'::text,
          'Yes'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"flip","pressure_type":"PERSPECTIVE","requires_prediction":true}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000044'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'At what price would you sell the guitar?'::text,
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
        ('31000000-0000-4000-8000-000000000441', rec.id, 'I would not sell at any price', 0, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000442', rec.id, '$1,000', 1, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000443', rec.id, '$10,000', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000444', rec.id, '$100,000', 3, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000445', rec.id, 'Only if my friend asked me to', 4, '{"tension_side":"left"}'::jsonb)
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
  v_round_id uuid := '40000000-0000-4000-8000-000000000008';
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
