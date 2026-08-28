-- Move Blind Mirror QA round off admin lifecycle test collision window (+40d from Aug 2026).
UPDATE public.daily_rounds
SET round_date = '2026-10-13', updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000007';

UPDATE public.marshmallows
SET daily_on = '2026-10-13', updated_at = now()
WHERE daily_round_id = '40000000-0000-4000-8000-000000000007';
