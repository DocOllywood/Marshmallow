-- Money Week Days 2-7 draft QA. Direct-URL only — NOT promoted.

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000004',
  'generosity-vs-boundaries',
  'Generosity versus boundaries',
  'When helping someone you care about conflicts with protecting your own limits.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000005',
  'ambition-vs-time',
  'Ambition versus time',
  'When earning more conflicts with the life you want outside work.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000006',
  'privacy-vs-gain',
  'Privacy versus gain',
  'When keeping something private conflicts with what someone will pay to hear.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000007',
  'fairness-vs-self-interest',
  'Fairness versus self-interest',
  'When equal treatment conflicts with what someone you love needs.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000008',
  'integrity-vs-advancement',
  'Integrity versus advancement',
  'When moving up conflicts with work you can stand behind.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

INSERT INTO public.belief_principles (id, slug, display_name, description)
VALUES (
  '60000000-0000-4000-8000-000000000009',
  'security-vs-autonomy',
  'Security versus autonomy',
  'When tying your finances to someone else conflicts with protecting your own standing.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

DO $$
DECLARE
  v_topic uuid;
  v_now timestamptz := now();
BEGIN
  SELECT id INTO v_topic FROM public.topics WHERE slug = 'human-nature' LIMIT 1;

  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000010',
    '2026-11-03',
    'How much should you cover for a friend?',
    'One friendship. One tab. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000004',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"left"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000060';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000060',
    'Your friend group splits every bill evenly. Your closest friend has been skipping outings — they admitted they can''t keep paying their share. Would you quietly cover their portion so they can still come?',
    v_topic,
    '40000000-0000-4000-8000-000000000010',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-03',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any cost"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000601', '31000000-0000-4000-8000-000000000060', 'Cover their share', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000602', '31000000-0000-4000-8000-000000000060', 'Let them sit it out', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000061';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000061',
    'They once covered your rent for two months when you were broke. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000010',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-03',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"LOYALTY","cost_type":"RELATIONSHIP","cost_level":1,"cost_label":"They covered your rent"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000611', '31000000-0000-4000-8000-000000000061', 'Cover their share', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000612', '31000000-0000-4000-8000-000000000061', 'Let them sit it out', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000062';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000062',
    'Covering them would run about $300 a month — roughly one night out and one group trip every month. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000010',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-03',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$300/month"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000621', '31000000-0000-4000-8000-000000000062', 'Cover them', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000622', '31000000-0000-4000-8000-000000000062', 'Stop covering', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000063';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000063',
    'You''re the friend who earns less. A friend offers to pay your share from now on so you can keep coming. Would you accept?',
    v_topic,
    '40000000-0000-4000-8000-000000000010',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-03',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000631', '31000000-0000-4000-8000-000000000063', 'No — I''d rather miss out', 0, '{"tension_side":"right"}'::jsonb),
    ('31000000-0000-4000-8000-000000000632', '31000000-0000-4000-8000-000000000063', 'Yes — I''d accept', 1, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000064';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000064',
    'When is it fair for a friend to pay your way?',
    v_topic,
    '40000000-0000-4000-8000-000000000010',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-03',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000641', '31000000-0000-4000-8000-000000000064', 'Never — I pay my own way', 0, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000642', '31000000-0000-4000-8000-000000000064', 'Only if I can pay them back', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000643', '31000000-0000-4000-8000-000000000064', 'If they''ve helped me before', 2, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000644', '31000000-0000-4000-8000-000000000064', 'If they''re offering freely', 3, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000645', '31000000-0000-4000-8000-000000000064', 'If I''d do the same for them', 4, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000011',
    '2026-11-10',
    'What would you trade for a bigger paycheck?',
    'One raise. One schedule. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000005',
    '60000000-0000-4000-8000-000000000005',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"left"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000070';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000070',
    'You like your current work-life balance. Your manager offers a 25% raise if you take on-call weekends. Would you take it?',
    v_topic,
    '40000000-0000-4000-8000-000000000011',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-10',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000701', '31000000-0000-4000-8000-000000000070', 'Decline', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000702', '31000000-0000-4000-8000-000000000070', 'Accept', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000071';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000071',
    'You''re behind on saving for a home down payment. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000011',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-10',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"PERSONAL_COST","cost_type":"MONEY","cost_level":1,"cost_label":"Behind on saving"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000711', '31000000-0000-4000-8000-000000000071', 'Decline', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000712', '31000000-0000-4000-8000-000000000071', 'Accept', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000072';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000072',
    'The schedule means working every other weekend — about 26 weekends a year. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000011',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-10',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"TIME","cost_type":"TIME","cost_level":2,"cost_label":"26 weekends a year"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000721', '31000000-0000-4000-8000-000000000072', 'Decline', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000722', '31000000-0000-4000-8000-000000000072', 'Accept', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000073';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000073',
    'You''re the manager. An employee turns down the weekend pay bump to protect their time off. Would you respect that?',
    v_topic,
    '40000000-0000-4000-8000-000000000011',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-10',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000731', '31000000-0000-4000-8000-000000000073', 'Yes', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000732', '31000000-0000-4000-8000-000000000073', 'No — I''d question their commitment', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000074';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000074',
    'How many on-call weekends a year is too many for a raise?',
    v_topic,
    '40000000-0000-4000-8000-000000000011',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-10',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000741', '31000000-0000-4000-8000-000000000074', 'Zero — weekends stay mine', 0, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000742', '31000000-0000-4000-8000-000000000074', 'Up to 6 weekends', 1, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000743', '31000000-0000-4000-8000-000000000074', 'Up to 12 weekends', 2, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000744', '31000000-0000-4000-8000-000000000074', 'Up to 26 if the pay is right', 3, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000745', '31000000-0000-4000-8000-000000000074', 'Any amount for enough pay', 4, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000012',
    '2026-11-17',
    'Would you sell a private story?',
    'One secret. One offer. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000006',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"right"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000080';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000080',
    'A podcast offers to pay you for telling a true story about your family that they don''t know you''d share. Would you do it?',
    v_topic,
    '40000000-0000-4000-8000-000000000012',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-17',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000801', '31000000-0000-4000-8000-000000000080', 'Share it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000802', '31000000-0000-4000-8000-000000000080', 'Keep it private', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000081';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000081',
    'The story involves your sibling, who asked you to keep it between you. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000012',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-17',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"LOYALTY","cost_type":"RELATIONSHIP","cost_level":1,"cost_label":"They asked you not to tell"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000811', '31000000-0000-4000-8000-000000000081', 'Share it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000812', '31000000-0000-4000-8000-000000000081', 'Keep it private', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000082';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000082',
    'The offer is $2,500. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000012',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-17',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$2,500"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000821', '31000000-0000-4000-8000-000000000082', 'Share it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000822', '31000000-0000-4000-8000-000000000082', 'Keep it private', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000083';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000083',
    'You''re the sibling. They shared your private story on a podcast for money. Would you forgive them?',
    v_topic,
    '40000000-0000-4000-8000-000000000012',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-17',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000831', '31000000-0000-4000-8000-000000000083', 'Yes', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000832', '31000000-0000-4000-8000-000000000083', 'No', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000084';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000084',
    'What would have to be true before you''d share a family secret for money?',
    v_topic,
    '40000000-0000-4000-8000-000000000012',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-17',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000841', '31000000-0000-4000-8000-000000000084', 'Nothing — some things stay private', 0, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000842', '31000000-0000-4000-8000-000000000084', 'Only if everyone involved agreed', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000843', '31000000-0000-4000-8000-000000000084', 'If it could help people like us', 2, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000844', '31000000-0000-4000-8000-000000000084', 'If the story was already mostly public', 3, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000845', '31000000-0000-4000-8000-000000000084', 'If I needed the money urgently', 4, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000013',
    '2026-11-24',
    'Is equal always fair?',
    'One inheritance. Two needs. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000011',
    '60000000-0000-4000-8000-000000000007',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"left"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000090';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000090',
    'Your parent left you and your sibling equal inheritances. Your sibling asks you to take less because they need it more. Would you?',
    v_topic,
    '40000000-0000-4000-8000-000000000013',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-24',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any details"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000901', '31000000-0000-4000-8000-000000000090', 'Give them more', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000902', '31000000-0000-4000-8000-000000000090', 'Keep it equal', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000091';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000091',
    'They supported you financially for a year when you were out of work. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000013',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-24',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"LOYALTY","cost_type":"RELATIONSHIP","cost_level":1,"cost_label":"They supported you for a year"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000911', '31000000-0000-4000-8000-000000000091', 'Give them more', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000912', '31000000-0000-4000-8000-000000000091', 'Keep it equal', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000092';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000092',
    'An uneven split would wipe out $40,000 of their medical debt. Your share would mostly sit in savings. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000013',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-24',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$40,000 debt"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000921', '31000000-0000-4000-8000-000000000092', 'Give them more', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000922', '31000000-0000-4000-8000-000000000092', 'Keep it equal', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000093';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000093',
    'You''re the sibling who needs more. They refuse to split unevenly. Would you resent them?',
    v_topic,
    '40000000-0000-4000-8000-000000000013',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-24',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000931', '31000000-0000-4000-8000-000000000093', 'Yes', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000932', '31000000-0000-4000-8000-000000000093', 'No — fair is fair', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000094';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000094',
    'What inheritance split would feel fair?',
    v_topic,
    '40000000-0000-4000-8000-000000000013',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-11-24',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000941', '31000000-0000-4000-8000-000000000094', '50/50, always', 0, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000942', '31000000-0000-4000-8000-000000000094', '60/40 in their favor', 1, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000943', '31000000-0000-4000-8000-000000000094', '70/30 in their favor', 2, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000944', '31000000-0000-4000-8000-000000000094', 'Whatever they need', 3, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000945', '31000000-0000-4000-8000-000000000094', 'I''d give them all of it', 4, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000014',
    '2026-12-01',
    'Would you sell work you don''t believe in?',
    'One promotion. One compromise. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000009',
    '60000000-0000-4000-8000-000000000008',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"right"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000100';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000100',
    'You''re offered a promotion that nearly doubles your visibility — and your pay — but you''d have to publicly defend work you think misleads customers. Would you take it?',
    v_topic,
    '40000000-0000-4000-8000-000000000014',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-01',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any offer"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a01', '31000000-0000-4000-8000-000000000100', 'Take it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000a02', '31000000-0000-4000-8000-000000000100', 'Decline', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000101';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000101',
    'You''re the main earner in your household right now. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000014',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-01',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"PERSONAL_COST","cost_type":"MONEY","cost_level":1,"cost_label":"You''re the main earner"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a11', '31000000-0000-4000-8000-000000000101', 'Take it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000a12', '31000000-0000-4000-8000-000000000101', 'Decline', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000102';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000102',
    'The raise is $45,000 a year. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000014',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-01',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"MONEY","cost_type":"MONEY","cost_level":2,"cost_label":"$45,000 raise"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a21', '31000000-0000-4000-8000-000000000102', 'Take it', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000a22', '31000000-0000-4000-8000-000000000102', 'Decline', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000103';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000103',
    'You''re a customer who was misled. An executive you know turned down that promotion on principle. Would you respect them?',
    v_topic,
    '40000000-0000-4000-8000-000000000014',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-01',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a31', '31000000-0000-4000-8000-000000000103', 'Yes', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000a32', '31000000-0000-4000-8000-000000000103', 'No', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000104';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000104',
    'What pay increase would make defending something you disagree with feel fair?',
    v_topic,
    '40000000-0000-4000-8000-000000000014',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-01',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a41', '31000000-0000-4000-8000-000000000104', 'None — not for any amount', 0, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a42', '31000000-0000-4000-8000-000000000104', '15% at most', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a43', '31000000-0000-4000-8000-000000000104', '25% if I needed it', 2, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a44', '31000000-0000-4000-8000-000000000104', '50% for the right money', 3, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000a45', '31000000-0000-4000-8000-000000000104', '100% or more', 4, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.daily_rounds (
    id, round_date, title, subtitle, topic_id, tension_id, principle_id, status, metadata
  )
  VALUES (
    '40000000-0000-4000-8000-000000000015',
    '2026-12-08',
    'Would you co-sign for family?',
    'One signature. One risk. See where your answer moves.',
    v_topic,
    '50000000-0000-4000-8000-000000000006',
    '60000000-0000-4000-8000-000000000009',
    'draft',
    '{"experiment":{"version":1,"archetype":"price","price_reference_side":"right"}}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    round_date = EXCLUDED.round_date,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    tension_id = EXCLUDED.tension_id,
    principle_id = EXCLUDED.principle_id,
    status = 'draft',
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000110';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000110',
    'Your sibling asks you to co-sign a $20,000 loan. You don''t think they''ll keep up with payments. Would you co-sign?',
    v_topic,
    '40000000-0000-4000-8000-000000000015',
    1,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-08',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"instinct","requires_prediction":false,"cost_label":"Before any obligation"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b01', '31000000-0000-4000-8000-000000000110', 'Co-sign', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000b02', '31000000-0000-4000-8000-000000000110', 'Refuse', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000111';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000111',
    'They co-signed a loan for you five years ago when you needed it. What now?',
    v_topic,
    '40000000-0000-4000-8000-000000000015',
    2,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-08',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"pressure","requires_prediction":false,"pressure_type":"LOYALTY","cost_type":"RELATIONSHIP","cost_level":1,"cost_label":"They co-signed for you"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b11', '31000000-0000-4000-8000-000000000111', 'Co-sign', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000b12', '31000000-0000-4000-8000-000000000111', 'Refuse', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000112';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000112',
    'If they default, the debt lands on your credit — and you may have to pay it yourself. What do you do?',
    v_topic,
    '40000000-0000-4000-8000-000000000015',
    3,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-08',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"consequence","requires_prediction":false,"pressure_type":"MONEY","cost_type":"REPUTATION","cost_level":2,"cost_label":"Your credit on the line"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b21', '31000000-0000-4000-8000-000000000112', 'Co-sign', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000b22', '31000000-0000-4000-8000-000000000112', 'Refuse', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000113';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    switch_prompt, is_line, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000113',
    'You''re the sibling. They won''t co-sign for you. Would you understand?',
    v_topic,
    '40000000-0000-4000-8000-000000000015',
    4,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-08',
    'daily',
    0,
    NULL,
    false,
    '{"experiment":{"stage":"flip","requires_prediction":true,"pressure_type":"PERSPECTIVE"}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b31', '31000000-0000-4000-8000-000000000113', 'Yes', 0, '{"tension_side":"left"}'::jsonb),
    ('31000000-0000-4000-8000-000000000b32', '31000000-0000-4000-8000-000000000113', 'No', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

  DELETE FROM public.marshmallow_choices WHERE marshmallow_id = '31000000-0000-4000-8000-000000000114';
  INSERT INTO public.marshmallows (
    id, question, topic_id, daily_round_id, round_position,
    opens_at, closes_at, reveals_at, hard_reveals_at,
    status, is_daily, daily_on, play_mode, minimum_result_sample,
    is_line, switch_prompt, metadata, created_by
  ) VALUES (
    '31000000-0000-4000-8000-000000000114',
    'When would co-signing for someone feel fair?',
    v_topic,
    '40000000-0000-4000-8000-000000000015',
    5,
    v_now - interval '1 hour',
    v_now + interval '48 hours',
    v_now + interval '49 hours',
    v_now + interval '49 hours',
    'draft',
    true,
    '2026-12-08',
    'daily',
    0,
    true,
    NULL,
    '{"experiment":{"stage":"line","requires_prediction":false}}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    daily_round_id = EXCLUDED.daily_round_id,
    round_position = EXCLUDED.round_position,
    daily_on = EXCLUDED.daily_on,
    is_line = true,
    metadata = EXCLUDED.metadata,
    status = 'draft';
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b41', '31000000-0000-4000-8000-000000000114', 'Never', 0, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b42', '31000000-0000-4000-8000-000000000114', 'Only with a repayment plan', 1, '{"tension_side":"right"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b43', '31000000-0000-4000-8000-000000000114', 'If they''ve co-signed for me', 2, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b44', '31000000-0000-4000-8000-000000000114', 'If I''d pay it for them anyway', 3, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
  INSERT INTO public.marshmallow_choices (id, marshmallow_id, label, sort_order, metadata) VALUES
    ('31000000-0000-4000-8000-000000000b45', '31000000-0000-4000-8000-000000000114', 'Only for a small amount I could absorb', 4, '{"tension_side":"left"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;
END $$;

DO $$
DECLARE
  v_now timestamptz := now();
BEGIN
  UPDATE public.marshmallows
  SET
    status = 'open',
    expires_at = NULL,
    opens_at = v_now - interval '1 hour',
    closes_at = v_now + interval '48 hours',
    reveals_at = v_now + interval '49 hours',
    hard_reveals_at = v_now + interval '49 hours'
  WHERE daily_round_id IN (
    '40000000-0000-4000-8000-000000000010',
    '40000000-0000-4000-8000-000000000011',
    '40000000-0000-4000-8000-000000000012',
    '40000000-0000-4000-8000-000000000013',
    '40000000-0000-4000-8000-000000000014',
    '40000000-0000-4000-8000-000000000015'
  )
    AND status IN ('draft', 'scheduled', 'open', 'closed');
END $$;
