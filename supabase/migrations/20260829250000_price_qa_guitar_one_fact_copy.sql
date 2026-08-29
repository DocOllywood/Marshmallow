-- Guitar continuous Price QA: one-fact escalation for Q2 and Q3 player-facing copy.

UPDATE public.marshmallows
SET question = 'The collector''s offer is now $1,000. What do you do?'
WHERE id = '31000000-0000-4000-8000-000000000041';

UPDATE public.marshmallows
SET question = 'The collector''s offer is now $10,000. What now?'
WHERE id = '31000000-0000-4000-8000-000000000042';
