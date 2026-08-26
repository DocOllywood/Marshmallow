-- Retag HR special-case inventory rows that were seeded as live, not quick.

UPDATE public.marshmallows
SET topic_id = (SELECT id FROM public.topics WHERE slug = 'love' LIMIT 1)
WHERE id = '30000000-0000-4000-8000-0000000000e1';

UPDATE public.marshmallows
SET topic_id = (SELECT id FROM public.topics WHERE slug = 'friendship' LIMIT 1)
WHERE id = '30000000-0000-4000-8000-0000000000e2';
