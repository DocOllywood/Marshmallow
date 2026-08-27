-- Consequence editorial pass: Q3 complicity beat (draft round only).
-- IDs, choices, metadata, and stage typing unchanged.

DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000006';
  v_q3_id uuid := '31000000-0000-4000-8000-000000000022';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.daily_rounds
    WHERE id = v_round_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'loyalty_justice_round_not_draft';
  END IF;

  UPDATE public.marshmallows
  SET question = 'Your friend asks you to be their cover at a couples dinner this weekend—the first time they''ll face the spouse since the affair ended. If you stay silent and go, you help them get through the night. If you tell the spouse now, you stop it. What now?'
  WHERE id = v_q3_id
    AND daily_round_id = v_round_id;
END $$;
