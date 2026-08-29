-- Money Week Days 2–7 semantic integrity refinements (forward-only).
-- Does not rewrite 20260829190000_money_week_days_2_7.sql.

-- Day 2: Flip copy — avoid pity framing for accepting help.
UPDATE public.marshmallows
SET
  question = 'You''re the friend who earns less. A friend offers to pay your share from now on so you can keep coming. Would you accept?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000063';

UPDATE public.marshmallow_choices
SET label = 'No — I''ll pay my own share'
WHERE id = '31000000-0000-4000-8000-000000000631';

-- Day 4: Realistic podcast offer without feeling trivial.
UPDATE public.marshmallows
SET
  question = 'The offer is $5,000. What do you do?',
  metadata = '{"experiment":{"stage":"consequence","pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$5,000","requires_prediction":false}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000082';

-- Day 6: Softer integrity framing + corrected Flip side mapping.
UPDATE public.marshmallows
SET
  question = 'You''re offered a promotion that nearly doubles your visibility — and your pay — but you''d have to publicly stand behind work you don''t fully believe in. Would you take it?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000100';

UPDATE public.marshmallows
SET
  question = 'You''re a customer who was misled. An executive you know turned down that promotion on principle. Would you respect them?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000103';

UPDATE public.marshmallow_choices
SET metadata = '{"tension_side":"right"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000a31';

UPDATE public.marshmallow_choices
SET metadata = '{"tension_side":"left"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000a32';

-- Day 7: Plain-English co-sign explanation in Q1.
UPDATE public.marshmallows
SET
  question = 'Your sibling asks you to co-sign a $20,000 loan — meaning you''d be legally responsible if they miss payments. You don''t think they''ll keep up. Would you co-sign?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000110';

-- Keep marshmallows open for direct-URL QA (draft rounds).
DO $$
DECLARE
  v_round_id uuid;
  v_now timestamptz := now();
BEGIN
  FOREACH v_round_id IN ARRAY ARRAY[
    '40000000-0000-4000-8000-000000000010'::uuid,
    '40000000-0000-4000-8000-000000000011'::uuid,
    '40000000-0000-4000-8000-000000000012'::uuid,
    '40000000-0000-4000-8000-000000000013'::uuid,
    '40000000-0000-4000-8000-000000000014'::uuid,
    '40000000-0000-4000-8000-000000000015'::uuid
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
      CONTINUE;
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
  END LOOP;
END $$;
