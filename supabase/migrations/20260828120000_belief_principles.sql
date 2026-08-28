-- Belief principles: longitudinal layer for Blind Mirror comparisons.
-- Adds principle_id FK on daily_rounds; backfills Loyalty vs Justice only.

CREATE TABLE public.belief_principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT belief_principles_slug_present CHECK (char_length(trim(slug)) > 0),
  CONSTRAINT belief_principles_display_name_present CHECK (char_length(trim(display_name)) > 0)
);

ALTER TABLE public.daily_rounds
  ADD COLUMN IF NOT EXISTS principle_id uuid REFERENCES public.belief_principles (id) ON DELETE SET NULL;

CREATE INDEX daily_rounds_principle_id_idx ON public.daily_rounds (principle_id);

ALTER TABLE public.belief_principles ENABLE ROW LEVEL SECURITY;

CREATE POLICY belief_principles_select_authenticated
  ON public.belief_principles FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.belief_principles TO authenticated;
GRANT ALL ON public.belief_principles TO service_role;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000001',
  'truth-versus-loyalty',
  'Truth versus loyalty',
  'When you know something that harms someone else, whether to tell them or protect the person who confided.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- Loyalty vs Justice: explicit editorial backfill (friend context).
UPDATE public.daily_rounds
SET
  principle_id = '60000000-0000-4000-8000-000000000001',
  metadata = metadata || '{"context":{"subject":"friend","label":"YOUR CLOSEST FRIEND"}}'::jsonb,
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000006';
