-- Human Nature beta editorial polish: in-place question/choice relabel + promoted order.
-- Preserves sealed history by keeping marshmallow and choice IDs stable.

CREATE OR REPLACE FUNCTION pg_temp._hn_edit_quick(
  p_id uuid,
  p_question text,
  p_a text,
  p_b text,
  p_priority integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.marshmallows
  SET question = p_question,
      quick_priority = p_priority
  WHERE id = p_id;

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 0
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_a
    WHERE marshmallow_id = p_id AND sort_order = 0;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_a, 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.marshmallow_choices
    WHERE marshmallow_id = p_id AND sort_order = 1
  ) THEN
    UPDATE public.marshmallow_choices SET label = p_b
    WHERE marshmallow_id = p_id AND sort_order = 1;
  ELSE
    INSERT INTO public.marshmallow_choices (marshmallow_id, label, sort_order)
    VALUES (p_id, p_b, 1);
  END IF;
END;
$$;

-- Five editorial replacements (same IDs, relabeled choices)
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000001',
  'Would most people rather be loved or understood?',
  'Loved',
  'Understood',
  NULL
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-00000000000c',
  'Would most people lie to spare a friend''s feelings?',
  'Yes',
  'No',
  NULL
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000017',
  'Would most people choose a life with no bad days if they could?',
  'Yes',
  'No',
  NULL
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000010',
  'Would most people rather be the funniest or the kindest person in the room?',
  'Funniest',
  'Kindest',
  NULL
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000011',
  'Do most people admit when they''re wrong?',
  'Yes',
  'No',
  NULL
);

-- Promoted first-three order (demote prior promotions, then assign 1–3)
UPDATE public.marshmallows
SET quick_priority = NULL
WHERE id IN (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000009'
);

SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000002',
  'Would most people rather have more money or more free time?',
  'Money',
  'Free time',
  1
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000004',
  'Would you rather be admired by thousands or truly known by five?',
  'Admired',
  'Known',
  2
);
SELECT pg_temp._hn_edit_quick(
  '30000000-0000-4000-8000-000000000009',
  'Would most people rather talk to animals or speak every human language?',
  'Animals',
  'Languages',
  3
);
