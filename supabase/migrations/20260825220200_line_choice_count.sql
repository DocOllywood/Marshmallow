-- Line questions use up to five discrete threshold choices.

CREATE OR REPLACE FUNCTION public.tg_enforce_published_choice_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_status public.marshmallow_status;
  v_is_line boolean := false;
  v_count int;
BEGIN
  IF TG_TABLE_NAME = 'marshmallows' THEN
    v_id := NEW.id;
    v_status := NEW.status;
    v_is_line := COALESCE(NEW.is_line, false);
  ELSE
    v_id := COALESCE(NEW.marshmallow_id, OLD.marshmallow_id);
    SELECT status, is_line
    INTO v_status, v_is_line
    FROM public.marshmallows
    WHERE id = v_id;
  END IF;

  IF v_status IN ('scheduled', 'open', 'closed', 'cancelled', 'revealed', 'archived') THEN
    SELECT count(*) INTO v_count
    FROM public.marshmallow_choices
    WHERE marshmallow_id = v_id;

    IF v_is_line THEN
      IF v_count < 2 OR v_count > 5 THEN
        RAISE EXCEPTION 'line_marshmallow_needs_2_to_5_choices';
      END IF;
    ELSIF v_count < 2 OR v_count > 4 THEN
      RAISE EXCEPTION 'published_marshmallow_needs_2_to_4_choices';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

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
