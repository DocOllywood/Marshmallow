BEGIN;
SELECT no_plan();

SELECT ok(
  public.is_valid_username('sam_21'),
  'valid username accepted'
);

SELECT ok(
  NOT public.is_valid_username('_nope'),
  'leading underscore rejected'
);

SELECT is(
  public.reveal_bonus_points(100),
  10,
  'bonus for 100 is capped at 10'
);

SELECT is(
  public.reveal_bonus_points(80),
  8,
  'bonus for 80 is 8'
);

SELECT is(
  public.reveal_bonus_points(47),
  5,
  'bonus for 47 rounds 4.7 to 5'
);

SELECT is(
  public.reveal_bonus_points(44),
  4,
  'bonus for 44 rounds 4.4 to 4'
);

SELECT is(
  (SELECT status FROM public.marshmallows WHERE id = '10000000-0000-4000-8000-000000000001'),
  'open'::public.marshmallow_status,
  'seeded open marshmallow'
);

SELECT is(
  (SELECT status FROM public.marshmallows WHERE id = '10000000-0000-4000-8000-000000000004'),
  'revealed'::public.marshmallow_status,
  'finalize moved closed marshmallow to revealed'
);

SELECT ok(
  public.is_revealed('10000000-0000-4000-8000-000000000004'),
  'revealed marshmallow is_revealed'
);

SELECT ok(
  NOT public.is_revealed('10000000-0000-4000-8000-000000000003'),
  'closed marshmallow is not revealed'
);

SELECT is(
  (SELECT count(*)::int FROM public.marshmallow_choices WHERE marshmallow_id = '10000000-0000-4000-8000-000000000003'),
  4,
  'four-choice example exists'
);

SELECT is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-4000-8000-000000000099'),
  'admin'::public.user_role,
  'seed admin bootstrap'
);

SELECT * FROM finish();
ROLLBACK;
