-- Marshmallow core schema, helpers, and server-authoritative functions.
-- RLS policies live in the following migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE public.topic_kind AS ENUM (
  'category',
  'fandom',
  'show',
  'celebrity',
  'event'
);
CREATE TYPE public.marshmallow_status AS ENUM (
  'draft',
  'scheduled',
  'open',
  'closed',
  'revealed',
  'archived'
);
CREATE TYPE public.report_status AS ENUM (
  'open',
  'reviewing',
  'resolved',
  'dismissed'
);

-- ---------------------------------------------------------------------------
-- Username helpers
-- ---------------------------------------------------------------------------

CREATE TABLE public.reserved_usernames (
  username text PRIMARY KEY
);

INSERT INTO public.reserved_usernames (username) VALUES
  ('admin'),
  ('administrator'),
  ('marshmallow'),
  ('support'),
  ('help'),
  ('api'),
  ('www'),
  ('moderator'),
  ('mod'),
  ('system'),
  ('root'),
  ('official'),
  ('notifications'),
  ('settings'),
  ('login'),
  ('signup');

CREATE OR REPLACE FUNCTION public.is_valid_username(p_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_username ~ '^[a-z0-9_]{3,24}$'
    AND p_username !~ '^_'
    AND p_username !~ '_$'
    AND p_username !~ '__';
$$;

CREATE OR REPLACE FUNCTION public.allocate_fallback_username(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate text;
  v_n int := 0;
BEGIN
  LOOP
    v_candidate := 'u' || substr(md5(p_user_id::text || v_n::text), 1, 12);
    EXIT WHEN public.is_valid_username(v_candidate)
      AND NOT EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = v_candidate)
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = v_candidate);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_candidate;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reputation helper (must match src/domain/reputation/points.ts)
-- ROUND(numeric, 0) is half away from zero. Cap 10.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reveal_bonus_points(p_base_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(10, ROUND((GREATEST(p_base_points, 0)::numeric) * 0.1, 0)::integer);
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'user',
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (public.is_valid_username(username)),
  CONSTRAINT profiles_display_name_present CHECK (char_length(trim(display_name)) > 0)
);

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'user'
       AND COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'role_not_writable';
    END IF;
    IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = NEW.username) THEN
      RAISE EXCEPTION 'username_reserved';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profile_id_immutable';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at_immutable';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'role_not_writable';
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username
     AND EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = NEW.username) THEN
    RAISE EXCEPTION 'username_reserved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_profiles_guard();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := lower(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')));
  IF v_username = ''
     OR NOT public.is_valid_username(v_username)
     OR EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = v_username)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := public.allocate_fallback_username(NEW.id);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), v_username),
    'user'
  );

  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- streaks table must exist before the trigger; created below then trigger attached.

CREATE TABLE public.streaks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  play_current integer NOT NULL DEFAULT 0 CHECK (play_current >= 0),
  play_longest integer NOT NULL DEFAULT 0 CHECK (play_longest >= 0),
  play_last_qualifying_on date,
  reveal_current integer NOT NULL DEFAULT 0 CHECK (reveal_current >= 0),
  reveal_longest integer NOT NULL DEFAULT 0 CHECK (reveal_longest >= 0),
  reveal_last_qualifying_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER streaks_set_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- handle_new_user references streaks; create trigger now.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.topic_kind NOT NULL,
  parent_id uuid REFERENCES public.topics (id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT topics_name_present CHECK (char_length(trim(name)) > 0),
  CONSTRAINT topics_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX topics_slug_unique ON public.topics (slug);

CREATE TRIGGER topics_set_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.user_topic_prefs (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

-- ---------------------------------------------------------------------------
-- Marshmallows
-- ---------------------------------------------------------------------------

CREATE TABLE public.marshmallows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  topic_id uuid REFERENCES public.topics (id) ON DELETE SET NULL,
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  reveals_at timestamptz NOT NULL,
  status public.marshmallow_status NOT NULL DEFAULT 'draft',
  is_daily boolean NOT NULL DEFAULT false,
  daily_on date,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marshmallows_question_present CHECK (char_length(trim(question)) > 0),
  CONSTRAINT marshmallows_timeline CHECK (opens_at < closes_at AND closes_at < reveals_at),
  CONSTRAINT marshmallows_daily_date CHECK (
    (is_daily AND daily_on IS NOT NULL) OR (NOT is_daily AND daily_on IS NULL)
  )
);

CREATE UNIQUE INDEX marshmallows_one_daily_per_utc_date
  ON public.marshmallows (daily_on)
  WHERE is_daily AND daily_on IS NOT NULL;

CREATE INDEX marshmallows_status_opens_idx
  ON public.marshmallows (status, opens_at);

CREATE TRIGGER marshmallows_set_updated_at
  BEFORE UPDATE ON public.marshmallows
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.marshmallow_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marshmallow_choices_label_present CHECK (char_length(trim(label)) > 0),
  CONSTRAINT marshmallow_choices_sort_order_nonneg CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX marshmallow_choices_order_unique
  ON public.marshmallow_choices (marshmallow_id, sort_order);

CREATE OR REPLACE FUNCTION public.tg_enforce_published_choice_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_status public.marshmallow_status;
  v_count int;
BEGIN
  IF TG_TABLE_NAME = 'marshmallows' THEN
    v_id := NEW.id;
    v_status := NEW.status;
  ELSE
    v_id := COALESCE(NEW.marshmallow_id, OLD.marshmallow_id);
    SELECT status INTO v_status FROM public.marshmallows WHERE id = v_id;
  END IF;

  IF v_status IN ('scheduled', 'open', 'closed', 'revealed', 'archived') THEN
    SELECT count(*) INTO v_count
    FROM public.marshmallow_choices
    WHERE marshmallow_id = v_id;
    IF v_count < 2 OR v_count > 4 THEN
      RAISE EXCEPTION 'published_marshmallow_needs_2_to_4_choices';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER marshmallows_choice_count
  AFTER INSERT OR UPDATE OF status ON public.marshmallows
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_enforce_published_choice_count();

CREATE CONSTRAINT TRIGGER marshmallow_choices_count
  AFTER INSERT OR UPDATE OR DELETE ON public.marshmallow_choices
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_enforce_published_choice_count();

-- Users never write lifecycle timestamps. Enforced by RLS + this guard
-- (service_role and later admin RPCs may).
CREATE OR REPLACE FUNCTION public.tg_marshmallows_user_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
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
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER marshmallows_user_guard
  BEFORE INSERT OR UPDATE ON public.marshmallows
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_marshmallows_user_guard();

-- ---------------------------------------------------------------------------
-- Entries + allocations
-- ---------------------------------------------------------------------------

CREATE TABLE public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  own_choice_id uuid REFERENCES public.marshmallow_choices (id) ON DELETE RESTRICT,
  sealed_at timestamptz,
  draft_updated_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, marshmallow_id)
);

CREATE UNIQUE INDEX entries_idempotency_unique
  ON public.entries (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX entries_marshmallow_sealed_idx
  ON public.entries (marshmallow_id)
  WHERE sealed_at IS NOT NULL;

CREATE TRIGGER entries_set_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.entry_allocations (
  entry_id uuid NOT NULL REFERENCES public.entries (id) ON DELETE CASCADE,
  choice_id uuid NOT NULL REFERENCES public.marshmallow_choices (id) ON DELETE RESTRICT,
  predicted_pct integer NOT NULL,
  PRIMARY KEY (entry_id, choice_id),
  CONSTRAINT entry_allocations_pct_range CHECK (predicted_pct BETWEEN 0 AND 100)
);

CREATE OR REPLACE FUNCTION public.tg_entries_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.sealed_at IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.marshmallow_id IS DISTINCT FROM OLD.marshmallow_id
       OR NEW.own_choice_id IS DISTINCT FROM OLD.own_choice_id
       OR NEW.sealed_at IS DISTINCT FROM OLD.sealed_at
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
      RAISE EXCEPTION 'entry_sealed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_immutability
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_entries_immutability();

CREATE OR REPLACE FUNCTION public.tg_allocations_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry public.entries%ROWTYPE;
  v_choice_marshmallow uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_entry FROM public.entries WHERE id = OLD.entry_id;
    IF v_entry.sealed_at IS NOT NULL THEN
      RAISE EXCEPTION 'entry_sealed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT * INTO v_entry FROM public.entries WHERE id = NEW.entry_id;
  IF v_entry.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'entry_sealed';
  END IF;
  SELECT marshmallow_id INTO v_choice_marshmallow
  FROM public.marshmallow_choices
  WHERE id = NEW.choice_id;
  IF v_choice_marshmallow IS DISTINCT FROM v_entry.marshmallow_id THEN
    RAISE EXCEPTION 'allocation_choice_mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entry_allocations_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.entry_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_allocations_guard();

-- ---------------------------------------------------------------------------
-- Results (server-written, readable only after reveal)
-- ---------------------------------------------------------------------------

CREATE TABLE public.marshmallow_results (
  marshmallow_id uuid PRIMARY KEY REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  total_sealed_votes integer NOT NULL CHECK (total_sealed_votes >= 0),
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marshmallow_result_choices (
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallow_results (marshmallow_id) ON DELETE CASCADE,
  choice_id uuid NOT NULL REFERENCES public.marshmallow_choices (id) ON DELETE RESTRICT,
  vote_count integer NOT NULL CHECK (vote_count >= 0),
  vote_pct numeric(5, 2) NOT NULL CHECK (vote_pct >= 0 AND vote_pct <= 100),
  PRIMARY KEY (marshmallow_id, choice_id)
);

CREATE TABLE public.scores (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  accuracy integer NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  base_points integer NOT NULL CHECK (base_points >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, marshmallow_id)
);

CREATE TABLE public.reveal_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  base_points integer NOT NULL CHECK (base_points >= 0),
  reveal_bonus_points integer NOT NULL DEFAULT 0 CHECK (reveal_bonus_points >= 0 AND reveal_bonus_points <= 10),
  reveal_bonus_earned boolean NOT NULL DEFAULT false,
  reveal_streak_qualified boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, marshmallow_id)
);

CREATE TABLE public.share_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid NOT NULL REFERENCES public.marshmallows (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, marshmallow_id),
  CONSTRAINT share_cards_public_id_format CHECK (public_id ~ '^[a-f0-9]{32}$')
);

CREATE OR REPLACE FUNCTION public.new_share_public_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT encode(extensions.gen_random_bytes(16), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------------

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_reason_present CHECK (char_length(trim(reason)) > 0)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  marshmallow_id uuid REFERENCES public.marshmallows (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_events_type_created_idx
  ON public.product_events (event_type, created_at DESC);

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
