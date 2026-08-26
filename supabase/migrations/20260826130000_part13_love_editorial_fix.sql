-- Part 13 HONESTY vs. KINDNESS: Love-framed editorial fix for Q2 and Q4 only.
-- Preserves marshmallow and choice IDs. In-place relabel only.

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000004';
  v_sealed int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.daily_rounds
    WHERE id = v_round_id
      AND status = 'draft'
      AND title = 'When does honesty become cruelty?'
  ) THEN
    RAISE EXCEPTION 'part13_round_not_draft_or_missing';
  END IF;

  SELECT count(*) INTO v_sealed
  FROM public.entries e
  JOIN public.marshmallows m ON m.id = e.marshmallow_id
  WHERE m.daily_round_id = v_round_id
    AND m.round_position IN (2, 4)
    AND e.sealed_at IS NOT NULL;

  IF v_sealed > 0 THEN
    RAISE EXCEPTION 'part13_q2_q4_has_sealed_entries';
  END IF;

  UPDATE public.marshmallows
  SET question = 'Would you want your partner to tell you if their closest friend thinks you''re wrong for them?'
  WHERE id = '31000000-0000-4000-8000-000000000011'
    AND daily_round_id = v_round_id
    AND round_position = 2;

  UPDATE public.marshmallow_choices
  SET label = 'Yes, I would want to know'
  WHERE id = '31000000-0000-4000-8000-000000000111'
    AND marshmallow_id = '31000000-0000-4000-8000-000000000011';

  UPDATE public.marshmallow_choices
  SET label = 'No, I''d rather not know'
  WHERE id = '31000000-0000-4000-8000-000000000112'
    AND marshmallow_id = '31000000-0000-4000-8000-000000000011';

  UPDATE public.marshmallows
  SET
    question = 'Would you tell your partner a hurtful truth about themselves if you believed they needed to hear it?',
    switch_prompt = 'What if they asked you directly and you knew the full truth would wound them?'
  WHERE id = '31000000-0000-4000-8000-000000000013'
    AND daily_round_id = v_round_id
    AND round_position = 4;

  UPDATE public.marshmallow_choices
  SET label = 'Yes, tell them'
  WHERE id = '31000000-0000-4000-8000-000000000131'
    AND marshmallow_id = '31000000-0000-4000-8000-000000000013';

  UPDATE public.marshmallow_choices
  SET label = 'No, protect their feelings'
  WHERE id = '31000000-0000-4000-8000-000000000132'
    AND marshmallow_id = '31000000-0000-4000-8000-000000000013';
END $$;
