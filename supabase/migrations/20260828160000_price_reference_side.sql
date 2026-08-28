-- Explicit crowd held-% reference side for Price QA experiment.
-- Forward-only: do not rewrite 20260828150000_price_qa_experiment.sql.

UPDATE public.daily_rounds
SET
  metadata = jsonb_set(
    metadata,
    '{experiment,price_reference_side}',
    '"left"'::jsonb,
    true
  ),
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000008'
  AND (metadata->'experiment'->>'archetype') = 'price';
