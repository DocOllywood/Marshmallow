-- Ensure today's Daily Q5 is The Line when still unplayed.
DO $$
DECLARE
  v_q5 uuid := '31000000-0000-4000-8000-000000000005';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.marshmallows WHERE id = v_q5 AND is_line = true
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.entries
    WHERE marshmallow_id = v_q5 AND sealed_at IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = v_q5;

  UPDATE public.marshmallows
  SET
    question = 'How long could your closest friend hide a major secret before you''d consider it a betrayal?',
    is_line = true
  WHERE id = v_q5;

  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order) VALUES
    ('31000000-0000-4000-8000-000000000051', v_q5, 'Immediately', 0),
    ('31000000-0000-4000-8000-000000000052', v_q5, 'A week', 1),
    ('31000000-0000-4000-8000-000000000053', v_q5, 'A month', 2),
    ('31000000-0000-4000-8000-000000000054', v_q5, 'A year', 3),
    ('31000000-0000-4000-8000-000000000055', v_q5, 'Never', 4);
END $$;
