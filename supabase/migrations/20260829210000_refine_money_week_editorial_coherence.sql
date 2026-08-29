-- Money Week editorial coherence pass (forward-only).
-- Relabels tensions for Days 3/4, trims copy, unifies titles.

UPDATE public.human_tensions
SET
  slug = 'time-ambition',
  left_label = 'TIME',
  right_label = 'AMBITION',
  display_label = 'TIME vs. AMBITION',
  description = 'When protecting your time conflicts with pushing your career forward.'
WHERE id = '50000000-0000-4000-8000-000000000005';

UPDATE public.human_tensions
SET
  slug = 'gain-privacy',
  left_label = 'GAIN',
  right_label = 'PRIVACY',
  display_label = 'GAIN vs. PRIVACY',
  description = 'When what someone will pay conflicts with keeping something private.'
WHERE id = '50000000-0000-4000-8000-000000000004';

-- Day 2 Q1/Q3 trim
UPDATE public.marshmallows
SET
  question = 'Your closest friend can''t keep paying their share of group outings. Would you quietly cover them so they can still come?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000060';

UPDATE public.marshmallows
SET
  question = 'Covering them would cost you about $300 a month — a night out plus one group trip. What do you do?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000062';

-- Day 3 Q1/Q3 trim
UPDATE public.marshmallows
SET
  question = 'You like your work-life balance. Your manager offers 25% more if you take on-call weekends. Would you take it?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000070';

UPDATE public.marshmallows
SET
  question = 'You''d work every other weekend — about 26 weekends a year. What do you do?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000072';

-- Day 4 Q1 trim
UPDATE public.marshmallows
SET
  question = 'A podcast offers to pay you for a true family story they don''t know you''d share. Would you tell it?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000080';

-- Day 6 title + Q1 trim
UPDATE public.daily_rounds
SET
  title = 'Would you take a promotion you don''t believe in?',
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000014';

UPDATE public.marshmallows
SET
  question = 'You''re offered a promotion with nearly double the pay — but you''d have to publicly stand behind work you don''t fully believe in. Would you take it?',
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000100';

-- Day 7 Q1 trim
UPDATE public.marshmallows
SET
  question = 'Your sibling asks you to co-sign a $20,000 loan — you''d be on the hook if they miss payments. You don''t think they''ll keep up. Would you co-sign?',
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
