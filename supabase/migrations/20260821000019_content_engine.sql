-- Human-operated editorial layer. No AI. No scraping.
-- Consumer-facing: entity_label, spoiler_context, image_url, expires_at.
-- Admin-only: marshmallow_editorial, content_sets, content_templates.

DO $$ BEGIN
  CREATE TYPE public.question_archetype AS ENUM (
    'who_won',
    'who_lost',
    'pick_one',
    'will_it_happen',
    'who_will',
    'agree_disagree',
    'lasting_power',
    'side_with',
    'better_moment',
    'freeform'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_freshness AS ENUM (
    'evergreen',
    'timely',
    'event_specific'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS entity_label text,
  ADD COLUMN IF NOT EXISTS spoiler_context text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.content_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marshmallow_editorial (
  marshmallow_id uuid PRIMARY KEY REFERENCES public.marshmallows(id) ON DELETE CASCADE,
  archetype public.question_archetype NOT NULL DEFAULT 'freeform',
  freshness public.content_freshness NOT NULL DEFAULT 'timely',
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_set_id uuid REFERENCES public.content_sets(id) ON DELETE SET NULL,
  set_position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  play_mode public.play_mode NOT NULL DEFAULT 'quick',
  archetype public.question_archetype NOT NULL DEFAULT 'freeform',
  entity_label text,
  spoiler_context text,
  freshness public.content_freshness NOT NULL DEFAULT 'timely',
  minimum_result_sample integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marshmallow_editorial_set_idx
  ON public.marshmallow_editorial (content_set_id, set_position);

ALTER TABLE public.content_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshmallow_editorial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_sets_admin ON public.content_sets;
CREATE POLICY content_sets_admin ON public.content_sets
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS marshmallow_editorial_admin ON public.marshmallow_editorial;
CREATE POLICY marshmallow_editorial_admin ON public.marshmallow_editorial
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS content_templates_admin ON public.content_templates;
CREATE POLICY content_templates_admin ON public.content_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marshmallow_editorial TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_templates TO authenticated;
GRANT ALL ON public.content_sets TO service_role;
GRANT ALL ON public.marshmallow_editorial TO service_role;
GRANT ALL ON public.content_templates TO service_role;

CREATE OR REPLACE FUNCTION public.tg_marshmallows_user_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'marshmallows_not_user_writable';
  END IF;
  IF NEW.opens_at IS DISTINCT FROM OLD.opens_at
     OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
     OR NEW.reveals_at IS DISTINCT FROM OLD.reveals_at
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_daily IS DISTINCT FROM OLD.is_daily
     OR NEW.daily_on IS DISTINCT FROM OLD.daily_on
     OR NEW.play_mode IS DISTINCT FROM OLD.play_mode
     OR NEW.minimum_result_sample IS DISTINCT FROM OLD.minimum_result_sample
     OR NEW.hard_reveals_at IS DISTINCT FROM OLD.hard_reveals_at
     OR NEW.result_available_at IS DISTINCT FROM OLD.result_available_at
     OR NEW.entity_label IS DISTINCT FROM OLD.entity_label
     OR NEW.spoiler_context IS DISTINCT FROM OLD.spoiler_context
     OR NEW.image_url IS DISTINCT FROM OLD.image_url
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_editorial(
  p_marshmallow_id uuid,
  p_archetype public.question_archetype DEFAULT 'freeform',
  p_freshness public.content_freshness DEFAULT 'timely',
  p_checklist jsonb DEFAULT '{}'::jsonb,
  p_entity_label text DEFAULT NULL,
  p_spoiler_context text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_content_set_id uuid DEFAULT NULL,
  p_set_position integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pos int;
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.marshmallows WHERE id = p_marshmallow_id) THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  IF p_image_url IS NOT NULL AND btrim(p_image_url) <> ''
     AND p_image_url !~* '^https?://' THEN
    RAISE EXCEPTION 'image_url_invalid';
  END IF;

  UPDATE public.marshmallows
  SET entity_label = nullif(btrim(coalesce(p_entity_label, '')), ''),
      spoiler_context = nullif(btrim(coalesce(p_spoiler_context, '')), ''),
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      expires_at = p_expires_at
  WHERE id = p_marshmallow_id;

  IF p_set_position IS NOT NULL THEN
    v_pos := p_set_position;
  ELSIF p_content_set_id IS NOT NULL THEN
    SELECT coalesce(max(set_position), -1) + 1 INTO v_pos
    FROM public.marshmallow_editorial
    WHERE content_set_id = p_content_set_id;
  ELSE
    v_pos := 0;
  END IF;

  INSERT INTO public.marshmallow_editorial (
    marshmallow_id, archetype, freshness, checklist, content_set_id, set_position
  ) VALUES (
    p_marshmallow_id,
    coalesce(p_archetype, 'freeform'),
    coalesce(p_freshness, 'timely'),
    coalesce(p_checklist, '{}'::jsonb),
    p_content_set_id,
    v_pos
  )
  ON CONFLICT (marshmallow_id) DO UPDATE SET
    archetype = excluded.archetype,
    freshness = excluded.freshness,
    checklist = excluded.checklist,
    content_set_id = CASE
      WHEN p_content_set_id IS NULL AND p_set_position IS NULL THEN marshmallow_editorial.content_set_id
      ELSE excluded.content_set_id
    END,
    set_position = CASE
      WHEN p_set_position IS NULL AND p_content_set_id IS NULL THEN marshmallow_editorial.set_position
      ELSE excluded.set_position
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_content_set(p_name text, p_notes text DEFAULT NULL)
RETURNS public.content_sets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.content_sets%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  INSERT INTO public.content_sets (name, notes, created_by)
  VALUES (trim(p_name), nullif(trim(coalesce(p_notes, '')), ''), auth.uid())
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_batch_create_quick(
  p_questions text[],
  p_set_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_archetype public.question_archetype DEFAULT 'freeform',
  p_choice_a text DEFAULT 'Yes',
  p_choice_b text DEFAULT 'No'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_q text;
  v_row public.marshmallows%ROWTYPE;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_now timestamptz := now();
  v_pos int := 0;
BEGIN
  PERFORM public.assert_admin();
  IF p_questions IS NULL OR array_length(p_questions, 1) IS NULL THEN
    RAISE EXCEPTION 'questions_invalid';
  END IF;
  IF p_set_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.content_sets WHERE id = p_set_id) THEN
    RAISE EXCEPTION 'set_not_found';
  END IF;
  IF p_set_id IS NOT NULL THEN
    SELECT coalesce(max(set_position), -1) + 1 INTO v_pos
    FROM public.marshmallow_editorial
    WHERE content_set_id = p_set_id;
  END IF;

  FOREACH v_q IN ARRAY p_questions
  LOOP
    IF char_length(trim(v_q)) < 8 THEN
      CONTINUE;
    END IF;
    v_row := public.admin_upsert_marshmallow(
      trim(v_q),
      v_now,
      v_now + interval '3 minutes',
      v_now + interval '4 minutes',
      jsonb_build_array(
        jsonb_build_object('label', coalesce(nullif(trim(p_choice_a), ''), 'Yes'), 'sort_order', 0),
        jsonb_build_object('label', coalesce(nullif(trim(p_choice_b), ''), 'No'), 'sort_order', 1)
      ),
      NULL,
      p_topic_id,
      false,
      'quick',
      5,
      v_now + interval '10 minutes'
    );
    PERFORM public.admin_save_editorial(
      v_row.id,
      coalesce(p_archetype, 'freeform'),
      'timely',
      '{}'::jsonb,
      NULL,
      NULL,
      NULL,
      NULL,
      p_set_id,
      v_pos
    );
    v_ids := v_ids || v_row.id;
    v_pos := v_pos + 1;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(v_ids), 'count', coalesce(array_length(v_ids, 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_schedule_set(
  p_set_id uuid,
  p_base_opens_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item record;
  v_index int := 0;
  v_open timestamptz;
  v_close timestamptz;
  v_reveal timestamptz;
  v_hard timestamptz;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.content_sets WHERE id = p_set_id) THEN
    RAISE EXCEPTION 'set_not_found';
  END IF;

  FOR v_item IN
    SELECT m.id, m.play_mode, m.is_daily, m.question, m.topic_id, m.minimum_result_sample,
           (
             SELECT coalesce(jsonb_agg(jsonb_build_object('label', c.label, 'sort_order', c.sort_order) ORDER BY c.sort_order), '[]'::jsonb)
             FROM public.marshmallow_choices c
             WHERE c.marshmallow_id = m.id
           ) AS choices
    FROM public.marshmallow_editorial e
    JOIN public.marshmallows m ON m.id = e.marshmallow_id
    WHERE e.content_set_id = p_set_id
      AND m.status IN ('draft', 'scheduled')
    ORDER BY e.set_position, m.created_at
  LOOP
    IF v_item.is_daily OR v_item.play_mode = 'daily' THEN
      RAISE EXCEPTION 'daily_conflict';
    END IF;
    v_open := p_base_opens_at + make_interval(mins => GREATEST(0, v_index - 1));
    v_close := p_base_opens_at + make_interval(mins => 3 + v_index);
    v_reveal := p_base_opens_at + make_interval(mins => 4 + v_index);
    v_hard := v_reveal + interval '6 minutes';

    PERFORM public.admin_upsert_marshmallow(
      v_item.question,
      v_open,
      v_close,
      v_reveal,
      v_item.choices,
      v_item.id,
      v_item.topic_id,
      false,
      'quick',
      v_item.minimum_result_sample,
      v_hard
    );
    PERFORM public.admin_schedule_marshmallow(v_item.id);
    v_ids := v_ids || v_item.id;
    v_index := v_index + 1;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(v_ids), 'count', coalesce(array_length(v_ids, 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_template(
  p_marshmallow_id uuid,
  p_name text DEFAULT NULL
) RETURNS public.content_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.marshmallows%ROWTYPE;
  v_ed public.marshmallow_editorial%ROWTYPE;
  v_choices jsonb;
  v_row public.content_templates%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO v_m FROM public.marshmallows WHERE id = p_marshmallow_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  SELECT * INTO v_ed FROM public.marshmallow_editorial WHERE marshmallow_id = p_marshmallow_id;
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('label', c.label, 'sort_order', c.sort_order) ORDER BY c.sort_order),
    '[]'::jsonb
  )
  INTO v_choices
  FROM public.marshmallow_choices c
  WHERE c.marshmallow_id = p_marshmallow_id;

  INSERT INTO public.content_templates (
    name, question, choices, topic_id, play_mode, archetype, entity_label,
    spoiler_context, freshness, minimum_result_sample, created_by
  ) VALUES (
    coalesce(nullif(trim(coalesce(p_name, '')), ''), left(v_m.question, 80)),
    v_m.question,
    v_choices,
    v_m.topic_id,
    v_m.play_mode,
    coalesce(v_ed.archetype, 'freeform'),
    v_m.entity_label,
    v_m.spoiler_context,
    coalesce(v_ed.freshness, 'timely'),
    v_m.minimum_result_sample,
    auth.uid()
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_from_template(p_template_id uuid)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_t public.content_templates%ROWTYPE;
  v_row public.marshmallows%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO v_t FROM public.content_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found';
  END IF;
  v_row := public.admin_upsert_marshmallow(
    v_t.question,
    v_now,
    v_now + interval '3 minutes',
    v_now + interval '4 minutes',
    v_t.choices,
    NULL,
    v_t.topic_id,
    v_t.play_mode = 'daily',
    v_t.play_mode,
    v_t.minimum_result_sample,
    v_now + interval '10 minutes'
  );
  PERFORM public.admin_save_editorial(
    v_row.id,
    v_t.archetype,
    v_t.freshness,
    '{}'::jsonb,
    v_t.entity_label,
    v_t.spoiler_context,
    NULL,
    NULL,
    NULL,
    NULL
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_duplicate_marshmallow(p_id uuid)
RETURNS public.marshmallows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src public.marshmallows%ROWTYPE;
  v_ed public.marshmallow_editorial%ROWTYPE;
  v_choices jsonb;
  v_now timestamptz := now();
  v_close interval;
  v_reveal interval;
  v_hard timestamptz;
  v_row public.marshmallows%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO v_src FROM public.marshmallows WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marshmallow_not_found';
  END IF;
  SELECT * INTO v_ed FROM public.marshmallow_editorial WHERE marshmallow_id = p_id;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('label', c.label, 'sort_order', c.sort_order) ORDER BY c.sort_order),
    '[]'::jsonb
  )
  INTO v_choices
  FROM public.marshmallow_choices c
  WHERE c.marshmallow_id = p_id;

  IF v_src.play_mode = 'quick' THEN
    v_close := interval '3 minutes';
    v_reveal := interval '4 minutes';
    v_hard := v_now + interval '10 minutes';
  ELSIF v_src.play_mode = 'live' THEN
    v_close := interval '30 minutes';
    v_reveal := interval '45 minutes';
    v_hard := v_now + v_reveal;
  ELSE
    v_close := interval '12 hours';
    v_reveal := interval '18 hours';
    v_hard := v_now + v_reveal;
  END IF;

  v_row := public.admin_upsert_marshmallow(
    v_src.question,
    v_now,
    v_now + v_close,
    v_now + v_reveal,
    v_choices,
    NULL,
    v_src.topic_id,
    v_src.is_daily,
    v_src.play_mode,
    v_src.minimum_result_sample,
    v_hard
  );

  UPDATE public.marshmallows
  SET entity_label = v_src.entity_label,
      spoiler_context = v_src.spoiler_context,
      image_url = v_src.image_url,
      expires_at = NULL
  WHERE id = v_row.id;

  INSERT INTO public.marshmallow_editorial (
    marshmallow_id, archetype, freshness, checklist, content_set_id, set_position
  ) VALUES (
    v_row.id,
    coalesce(v_ed.archetype, 'freeform'),
    coalesce(v_ed.freshness, 'timely'),
    coalesce(v_ed.checklist, '{}'::jsonb),
    NULL,
    0
  )
  ON CONFLICT (marshmallow_id) DO UPDATE SET
    archetype = excluded.archetype,
    freshness = excluded.freshness,
    checklist = excluded.checklist;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_content_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.opens_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        m.id,
        m.question,
        m.play_mode::text AS play_mode,
        m.status::text AS status,
        m.opens_at,
        m.topic_id,
        t.name AS topic_name,
        coalesce(ed.archetype::text, 'freeform') AS archetype,
        coalesce(ed.freshness::text, 'timely') AS freshness,
        (SELECT count(*)::int FROM public.marshmallow_choices c WHERE c.marshmallow_id = m.id) AS choice_count,
        (
          SELECT count(DISTINCT ev.user_id)::int
          FROM public.product_events ev
          WHERE ev.marshmallow_id = m.id AND ev.event_type = 'marshmallow_viewed'
        ) AS views,
        (
          SELECT count(*)::int FROM public.entries e
          WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
        ) AS sealed,
        (
          SELECT count(*)::int FROM public.entries e
          WHERE e.marshmallow_id = m.id
            AND e.sealed_at IS NOT NULL
            AND m.status = 'revealed'
            AND m.cancelled_at IS NULL
        ) AS eligible_reveals,
        (
          SELECT count(*)::int FROM public.reveal_opens ro
          WHERE ro.marshmallow_id = m.id
        ) AS reveal_opens,
        (
          SELECT avg(s.accuracy) FROM public.scores s
          WHERE s.marshmallow_id = m.id
        ) AS average_accuracy,
        (
          SELECT count(DISTINCT e.user_id)::int
          FROM public.reveal_opens ro
          JOIN public.entries e ON e.user_id = ro.user_id
          WHERE ro.marshmallow_id = m.id
            AND e.marshmallow_id <> m.id
            AND e.sealed_at IS NOT NULL
            AND e.sealed_at > ro.opened_at
        ) AS next_play,
        (
          SELECT count(DISTINCT sc.user_id)::int
          FROM public.share_cards sc
          WHERE sc.marshmallow_id = m.id
        ) AS shares,
        (
          SELECT r.total_sealed_votes FROM public.marshmallow_results r
          WHERE r.marshmallow_id = m.id
        ) AS sample_size,
        (
          SELECT count(DISTINCT e2.user_id)::int
          FROM public.entries e
          JOIN public.entries e2
            ON e2.user_id = e.user_id
           AND e2.marshmallow_id <> e.marshmallow_id
           AND e2.sealed_at IS NOT NULL
           AND e2.sealed_at > e.sealed_at
          JOIN public.marshmallows mq ON mq.id = e2.marshmallow_id AND mq.play_mode = 'quick'
          WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
        ) AS quick_continuation
      FROM public.marshmallows m
      LEFT JOIN public.topics t ON t.id = m.topic_id
      LEFT JOIN public.marshmallow_editorial ed ON ed.marshmallow_id = m.id
      WHERE m.status <> 'draft'
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_editorial_comparisons()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT jsonb_build_object(
      'by_archetype', coalesce((
        SELECT jsonb_agg(row_to_json(a) ORDER BY a.archetype)
        FROM (
          SELECT
            coalesce(ed.archetype::text, 'freeform') AS archetype,
            count(*)::int AS items,
            coalesce(sum((SELECT count(*) FROM public.entries e WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL)), 0)::int AS sealed,
            coalesce(sum((
              SELECT count(DISTINCT ev.user_id) FROM public.product_events ev
              WHERE ev.marshmallow_id = m.id AND ev.event_type = 'marshmallow_viewed'
            )), 0)::int AS views,
            coalesce(sum((SELECT count(*) FROM public.reveal_opens ro WHERE ro.marshmallow_id = m.id)), 0)::int AS reveal_opens,
            coalesce(sum((
              SELECT count(*) FROM public.entries e
              WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
                AND m.status = 'revealed' AND m.cancelled_at IS NULL
            )), 0)::int AS eligible,
            coalesce(sum((SELECT count(DISTINCT sc.user_id) FROM public.share_cards sc WHERE sc.marshmallow_id = m.id)), 0)::int AS shares
          FROM public.marshmallows m
          LEFT JOIN public.marshmallow_editorial ed ON ed.marshmallow_id = m.id
          WHERE m.status = 'revealed'
          GROUP BY coalesce(ed.archetype::text, 'freeform')
        ) a
      ), '[]'::jsonb),
      'by_category_mode_archetype', coalesce((
        SELECT jsonb_agg(row_to_json(b) ORDER BY b.topic_name, b.play_mode, b.archetype)
        FROM (
          SELECT
            coalesce(t.name, 'No topic') AS topic_name,
            m.play_mode::text AS play_mode,
            coalesce(ed.archetype::text, 'freeform') AS archetype,
            count(*)::int AS items,
            coalesce(sum((SELECT count(*) FROM public.entries e WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL)), 0)::int AS sealed,
            coalesce(sum((
              SELECT count(DISTINCT ev.user_id) FROM public.product_events ev
              WHERE ev.marshmallow_id = m.id AND ev.event_type = 'marshmallow_viewed'
            )), 0)::int AS views,
            coalesce(sum((SELECT count(*) FROM public.reveal_opens ro WHERE ro.marshmallow_id = m.id)), 0)::int AS reveal_opens,
            coalesce(sum((
              SELECT count(*) FROM public.entries e
              WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
                AND m.status = 'revealed' AND m.cancelled_at IS NULL
            )), 0)::int AS eligible,
            coalesce(sum((SELECT count(DISTINCT sc.user_id) FROM public.share_cards sc WHERE sc.marshmallow_id = m.id)), 0)::int AS shares
          FROM public.marshmallows m
          LEFT JOIN public.topics t ON t.id = m.topic_id
          LEFT JOIN public.marshmallow_editorial ed ON ed.marshmallow_id = m.id
          WHERE m.status = 'revealed'
          GROUP BY coalesce(t.name, 'No topic'), m.play_mode, coalesce(ed.archetype::text, 'freeform')
        ) b
      ), '[]'::jsonb)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_content_inventory()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (timezone('utc', now()))::date;
  v_tomorrow date := v_today + 1;
BEGIN
  PERFORM public.assert_admin();
  RETURN jsonb_build_object(
    'today', jsonb_build_object(
      'date', v_today,
      'quick', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'quick'
          AND status IN ('scheduled', 'open')
          AND (opens_at AT TIME ZONE 'utc')::date = v_today
      ),
      'live', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'live'
          AND status IN ('scheduled', 'open')
          AND (opens_at AT TIME ZONE 'utc')::date = v_today
      ),
      'daily', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'daily'
          AND status IN ('scheduled', 'open', 'closed', 'revealed')
          AND daily_on = v_today
      )
    ),
    'tomorrow', jsonb_build_object(
      'date', v_tomorrow,
      'quick', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'quick'
          AND status IN ('scheduled', 'open')
          AND (opens_at AT TIME ZONE 'utc')::date = v_tomorrow
      ),
      'live', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'live'
          AND status IN ('scheduled', 'open')
          AND (opens_at AT TIME ZONE 'utc')::date = v_tomorrow
      ),
      'daily', (
        SELECT count(*)::int FROM public.marshmallows
        WHERE play_mode = 'daily'
          AND status IN ('scheduled', 'open', 'draft')
          AND daily_on = v_tomorrow
      )
    ),
    'warn_quick_below', 5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_content_calendar()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.opens_at), '[]'::jsonb)
    FROM (
      SELECT
        m.id,
        m.question,
        m.play_mode::text AS play_mode,
        m.status::text AS status,
        m.opens_at,
        m.closes_at,
        m.reveals_at,
        m.daily_on,
        coalesce(ed.archetype::text, 'freeform') AS archetype,
        t.name AS topic_name
      FROM public.marshmallows m
      LEFT JOIN public.marshmallow_editorial ed ON ed.marshmallow_id = m.id
      LEFT JOIN public.topics t ON t.id = m.topic_id
      WHERE m.status IN ('draft', 'scheduled', 'open', 'closed')
        AND m.opens_at < now() + interval '7 days'
        AND m.opens_at > now() - interval '1 day'
    ) x
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_editorial(uuid, public.question_archetype, public.content_freshness, jsonb, text, text, text, timestamptz, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_editorial(uuid, public.question_archetype, public.content_freshness, jsonb, text, text, text, timestamptz, uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_create_content_set(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_content_set(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_batch_create_quick(text[], uuid, uuid, public.question_archetype, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_batch_create_quick(text[], uuid, uuid, public.question_archetype, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_bulk_schedule_set(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_schedule_set(uuid, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_save_template(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_template(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_create_from_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_from_template(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_editorial_comparisons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_editorial_comparisons() TO authenticated;
REVOKE ALL ON FUNCTION public.get_content_inventory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_inventory() TO authenticated;
REVOKE ALL ON FUNCTION public.get_content_calendar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_calendar() TO authenticated;
