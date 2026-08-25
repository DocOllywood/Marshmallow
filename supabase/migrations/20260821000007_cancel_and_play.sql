-- Add cancelled as a lifecycle value. Must commit before any SQL uses it.

ALTER TYPE public.marshmallow_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.marshmallows
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;
