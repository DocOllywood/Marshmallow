-- Launch Money Era daily (draft): partner dream job / relocation sacrifice.
-- Direct-URL QA only — NOT promoted to public Daily.
-- Round date 2026-10-27 avoids Blind Mirror (2026-10-13) and Price guitar QA (2026-10-20).

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000003',
  'love-vs-ambition',
  'Love versus ambition',
  'When your partner''s career opportunity requires you to sacrifice your own, whether love or ambition should decide.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

DO $$
DECLARE
  rec record;
  v_now timestamptz := now();
  v_topic uuid;
  v_round_id uuid := '40000000-0000-4000-8000-000000000009';
  v_round_date date := '2026-10-27';
  v_principle_id uuid := '60000000-0000-4000-8000-000000000003';
  v_tension_id uuid := '50000000-0000-4000-8000-000000000003';
BEGIN
  SELECT id INTO v_topic FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    v_round_id,
    v_round_date,
    'Would you move for their dream job?',
    'One relationship. One offer. See where your answer moves.',
    v_topic,
    v_tension_id,
    v_principle_id,
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"left"}}'::jsonb
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
          '31000000-0000-4000-8000-000000000050'::uuid,
          '31000000-0000-4000-8000-000000000501'::uuid,
          '31000000-0000-4000-8000-000000000502'::uuid,
          v_round_id,
          1::smallint,
          'Your partner was offered a job they''ve wanted for years in another city. You would have to leave your job, your friends, and the life you built where you are. Would you move with them?'::text,
          'Move with them'::text,
          'Stay where you are'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer details"}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000051'::uuid,
          '31000000-0000-4000-8000-000000000511'::uuid,
          '31000000-0000-4000-8000-000000000512'::uuid,
          v_round_id,
          2::smallint,
          'The role comes with a 40% raise for them — but you would likely be unemployed for at least three months after moving, with no guarantee you''d find work quickly. What now?'::text,
          'Move with them'::text,
          'Stay where you are'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"pressure","pressure_type":"PERSONAL_COST","cost_type":"TIME","cost_level":1,"cost_label":"Three months without work","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000052'::uuid,
          '31000000-0000-4000-8000-000000000521'::uuid,
          '31000000-0000-4000-8000-000000000522'::uuid,
          v_round_id,
          3::smallint,
          'The offer is now concrete: their new salary would be $120,000. Your savings would cover about three months — after that, you''d depend on their income. What do you do?'::text,
          'Move with them'::text,
          'Stay where you are'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"consequence","pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$120,000","requires_prediction":false}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000053'::uuid,
          '31000000-0000-4000-8000-000000000531'::uuid,
          '31000000-0000-4000-8000-000000000532'::uuid,
          v_round_id,
          4::smallint,
          'Now you are your partner. You got the offer in another city. Your partner says they won''t move — they won''t leave their career and friends. Would you take the job anyway?'::text,
          'No, I would stay'::text,
          'Yes, I would go'::text,
          'left'::text,
          'right'::text,
          '{"experiment":{"stage":"flip","pressure_type":"PERSPECTIVE","requires_prediction":true}}'::jsonb
        ),
        (
          '31000000-0000-4000-8000-000000000054'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'At what salary would you expect your partner to move with you?'::text,
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
        ('31000000-0000-4000-8000-000000000541', rec.id, 'I wouldn''t expect them to move', 0, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000542', rec.id, '$80,000', 1, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000543', rec.id, '$120,000', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000544', rec.id, '$200,000', 3, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000545', rec.id, 'Only if they wanted to anyway', 4, '{"tension_side":"left"}'::jsonb)
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

-- Open marshmallows for direct-URL internal QA without promoting round_date to today.
DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000009';
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
