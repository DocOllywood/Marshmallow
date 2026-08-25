BEGIN;
SELECT no_plan();

-- Two users created in this transaction. Profiles arrive via handle_new_user.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'authenticated', 'authenticated', 'usera@marshmallow.test',
  extensions.crypt('password-a-1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"user_a"}'::jsonb, now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'authenticated', 'authenticated', 'userb@marshmallow.test',
  extensions.crypt('password-b-1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"user_b"}'::jsonb, now(), now(), '', '', '', ''
);

-- User A seals the open 2-choice marshmallow.
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'role', 'authenticated',
  'aud', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.seal_entry(
    '10000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '[{"choice_id":"11000000-0000-4000-8000-000000000001","predicted_pct":64},{"choice_id":"11000000-0000-4000-8000-000000000002","predicted_pct":36}]'::jsonb,
    'idem-a-1'
  )$$,
  'user A can seal a valid open entry'
);

SELECT is(
  (SELECT count(*)::int FROM public.entries WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  1,
  'user A sees own entry'
);

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'role', 'authenticated',
  'aud', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.entries),
  0,
  'user B cannot read user A entries'
);

SELECT is(
  (SELECT count(*)::int FROM public.entry_allocations),
  0,
  'user B cannot read user A allocations'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'$$,
  '42501'
);

SELECT is(
  (SELECT count(*)::int FROM public.marshmallows WHERE status = 'draft'),
  0,
  'user B cannot see draft marshmallows'
);

SELECT is(
  (SELECT count(*)::int FROM public.marshmallow_results WHERE marshmallow_id = '10000000-0000-4000-8000-000000000003'),
  0,
  'closed marshmallow results are not readable'
);

SELECT is(
  (SELECT count(*)::int FROM public.scores),
  0,
  'no scores readable before a sealed user has a revealed marshmallow'
);

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'role', 'authenticated',
  'aud', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.open_reveal('10000000-0000-4000-8000-000000000001')$$,
  'results_not_available',
  'user A cannot open reveal before results exist'
);

SELECT * FROM finish();
ROLLBACK;
