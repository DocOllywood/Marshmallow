-- Consumer delight pass: stronger Daily, hide generic Live + stale QA from discovery.

UPDATE public.marshmallows
SET
  question = 'What would hurt more to discover?',
  expires_at = NULL
WHERE id = '30000000-0000-4000-8000-0000000000d1';

-- Preserve choice ids for sealed entries: relabel in place.
UPDATE public.marshmallow_choices
SET label = 'They cheated once'
WHERE marshmallow_id = '30000000-0000-4000-8000-0000000000d1'
  AND sort_order = 0;

UPDATE public.marshmallow_choices
SET label = 'They''re in love with someone else'
WHERE marshmallow_id = '30000000-0000-4000-8000-0000000000d1'
  AND sort_order = 1;
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE m.id IN (
  '30000000-0000-4000-8000-0000000000e1',
  '30000000-0000-4000-8000-0000000000e2'
)
AND NOT EXISTS (
  SELECT 1 FROM public.entries e
  WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
);

-- Expire known seed/QA inventory still discoverable without sealed history.
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE (
    m.id IN (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004'
    )
    OR m.question ILIKE '%snack disappears%'
    OR m.question ILIKE '%Who does America think won the argument%'
  )
  AND m.status IN ('open', 'scheduled', 'closed')
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
  );

-- Catch any remaining unplayed non-beta quick/live inventory.
UPDATE public.marshmallows m
SET expires_at = now() - interval '1 hour'
WHERE m.play_mode IN ('quick', 'live')
  AND m.status IN ('open', 'scheduled')
  AND m.id::text NOT LIKE '30000000-0000-4000-8000-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.marshmallow_id = m.id AND e.sealed_at IS NOT NULL
  );
