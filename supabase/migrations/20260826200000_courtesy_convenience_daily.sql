-- Future/test Daily: COURTESY vs. CONVENIENCE · Human Nature · everyday humanity.
-- Draft only — does not replace today's production Daily or historical rounds.

INSERT INTO public.human_tensions (id, slug, left_label, right_label, display_label, description, active)
VALUES (
  '50000000-0000-4000-8000-000000000010',
  'courtesy-convenience',
  'COURTESY',
  'CONVENIENCE',
  'COURTESY vs. CONVENIENCE',
  'When small social consideration conflicts with what is easiest right now.',
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
  v_round_id uuid := '40000000-0000-4000-8000-000000000005';
  v_round_date date := '2026-09-15';
BEGIN
  INSERT INTO public.daily_rounds (id, round_date, title, subtitle, topic_id, tension_id, status)
  VALUES (
    v_round_id,
    v_round_date,
    'What do we owe strangers?',
    'Five small dilemmas about courtesy, convenience, and everyday consideration.',
    (SELECT id FROM public.topics WHERE slug = 'human-nature' LIMIT 1),
    '50000000-0000-4000-8000-000000000010',
    'draft'
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
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
          '31000000-0000-4000-8000-000000000015'::uuid,
          '31000000-0000-4000-8000-000000000151'::uuid,
          '31000000-0000-4000-8000-000000000152'::uuid,
          v_round_id,
          1::smallint,
          'You''re sitting on a public bench and are about to light a cigarette. Do you ask the person sitting beside you if they mind?'::text,
          'Yes, ask'::text,
          'No, just light it'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000016'::uuid,
          '31000000-0000-4000-8000-000000000161'::uuid,
          '31000000-0000-4000-8000-000000000162'::uuid,
          v_round_id,
          2::smallint,
          'Someone is walking toward the elevator as the doors begin closing. Do you hold it even if they''re still several steps away?'::text,
          'Hold it'::text,
          'Let it close'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000017'::uuid,
          '31000000-0000-4000-8000-000000000171'::uuid,
          '31000000-0000-4000-8000-000000000172'::uuid,
          v_round_id,
          3::smallint,
          'A worker is cleaning a public space you''re using. Do you usually acknowledge or thank them?'::text,
          'Yes'::text,
          'No'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000018'::uuid,
          '31000000-0000-4000-8000-000000000181'::uuid,
          '31000000-0000-4000-8000-000000000182'::uuid,
          v_round_id,
          4::smallint,
          'You''re in a rush and someone ahead of you drops several things. Do you stop to help?'::text,
          'Yes'::text,
          'No'::text,
          'left'::text,
          'right'::text
        ),
        (
          '31000000-0000-4000-8000-000000000019'::uuid,
          NULL::uuid,
          NULL::uuid,
          v_round_id,
          5::smallint,
          'How much inconvenience would you accept to help a stranger with something minor?'::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text
        )
    ) AS seed (id, choice_a_id, choice_b_id, round_id, position, question, choice_a, choice_b, side_a, side_b)
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
        play_mode = 'daily',
        status = 'draft';

      INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
        ('31000000-0000-4000-8000-000000000191', rec.id, 'A few seconds', 0, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000192', rec.id, '1 minute', 1, '{"tension_side":"left"}'::jsonb),
        ('31000000-0000-4000-8000-000000000193', rec.id, '5 minutes', 2, '{"tension_side":"neutral"}'::jsonb),
        ('31000000-0000-4000-8000-000000000194', rec.id, '15 minutes', 3, '{"tension_side":"right"}'::jsonb),
        ('31000000-0000-4000-8000-000000000195', rec.id, 'I probably wouldn''t', 4, '{"tension_side":"right"}'::jsonb)
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
      CASE
        WHEN rec.position = 4 THEN 'What if stopping would make you five minutes late?'::text
        ELSE NULL
      END,
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
      play_mode = 'daily',
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
