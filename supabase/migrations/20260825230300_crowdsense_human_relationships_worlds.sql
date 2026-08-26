-- CrowdSense category boards: Human Relationships worlds only.

CREATE OR REPLACE FUNCTION public.crowdsense_world_id(p_topic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cursor uuid := p_topic_id;
  v_id uuid;
  v_parent uuid;
  v_slug text;
  v_guard int := 0;
BEGIN
  IF v_cursor IS NULL THEN
    RETURN NULL;
  END IF;

  LOOP
    v_guard := v_guard + 1;
    IF v_guard > 16 THEN
      RETURN NULL;
    END IF;

    SELECT t.id, t.parent_id, t.slug
    INTO v_id, v_parent, v_slug
    FROM public.topics t
    WHERE t.id = v_cursor;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF v_parent IS NULL THEN
      IF v_slug IN ('love', 'friendship', 'dating-sex', 'family', 'human-nature') THEN
        RETURN v_id;
      END IF;
      RETURN NULL;
    END IF;

    v_cursor := v_parent;
  END LOOP;
END;
$$;
