-- Refine launch Money Era daily editorial (draft QA round ...000009).
-- Forward-only: does not rewrite 20260829170000_launch_money_daily_partner_job.sql.

UPDATE public.belief_principles
SET
  slug = 'partnership-vs-independence',
  display_name = 'Partnership versus independence',
  description = 'When one person''s opportunity asks the other to rearrange their life, whether togetherness or self-direction should decide.'
WHERE id = '60000000-0000-4000-8000-000000000003';

UPDATE public.daily_rounds
SET
  tension_id = '50000000-0000-4000-8000-000000000007',
  subtitle = 'One offer. Two lives. See where your answer moves.',
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000009';

UPDATE public.marshmallows
SET
  question = 'Your partner was offered a job they''ve wanted for years in another city. You''d have to leave your job, your friends, and the life you built where you are. Would you move with them?',
  metadata = '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer details"}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000050';

UPDATE public.marshmallows
SET
  question = 'The role comes with a 40% raise for them — but you would likely be unemployed for at least three months after moving, with no guarantee you''d find work quickly. What now?',
  metadata = '{"experiment":{"stage":"pressure","pressure_type":"PERSONAL_COST","cost_type":"TIME","cost_level":1,"cost_label":"Three months without work","requires_prediction":false}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000051';

UPDATE public.marshmallows
SET
  question = 'Moving means giving up your $68,000-a-year job — with nothing else lined up. What do you do?',
  metadata = '{"experiment":{"stage":"consequence","pressure_type":"MONEY","cost_type":"CAREER","cost_level":2,"cost_label":"$68,000 salary","requires_prediction":false}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000052';

UPDATE public.marshmallows
SET
  question = 'Now you''re your partner. You got the offer in another city. They say they won''t move — they won''t leave their job, friends, or the life they built. Would you take the job anyway?',
  metadata = '{"experiment":{"stage":"flip","pressure_type":"PERSPECTIVE","requires_prediction":true}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000053';

UPDATE public.marshmallows
SET
  question = 'When is it fair to ask your partner to move for your career?',
  metadata = '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
  updated_at = now()
WHERE id = '31000000-0000-4000-8000-000000000054';

UPDATE public.marshmallow_choices
SET label = 'Never — that''s their own life to live', metadata = '{"tension_side":"right"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000541';

UPDATE public.marshmallow_choices
SET label = 'Only if they''d choose it freely', metadata = '{"tension_side":"right"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000542';

UPDATE public.marshmallow_choices
SET label = 'If I''ve moved or sacrificed for them before', metadata = '{"tension_side":"left"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000543';

UPDATE public.marshmallow_choices
SET label = 'If we''re building a long-term life together', metadata = '{"tension_side":"left"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000544';

UPDATE public.marshmallow_choices
SET label = 'If the opportunity is once-in-a-lifetime for us', metadata = '{"tension_side":"left"}'::jsonb
WHERE id = '31000000-0000-4000-8000-000000000545';

-- Keep marshmallows open for direct-URL QA.
DO $$
DECLARE
  v_round_id uuid := '40000000-0000-4000-8000-000000000009';
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_rounds WHERE id = v_round_id) THEN
    RETURN;
  END IF;

  UPDATE public.marshmallows
  SET
    status = 'open',
    expires_at = NULL,
    opens_at = v_now - interval '1 hour',
    closes_at = v_now + interval '48 hours',
    reveals_at = v_now + interval '49 hours',
    hard_reveals_at = v_now + interval '49 hours'
  WHERE daily_round_id = v_round_id
    AND status IN ('draft', 'scheduled', 'open', 'closed');
END $$;
