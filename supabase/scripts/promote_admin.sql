-- Promote an existing user to admin. Run in the SQL editor as a privileged role
-- (dashboard SQL as postgres, or service-role connection). Never expose this
-- as an application API.
--
-- 1. Confirm the user exists and signed up normally (role defaults to user).
-- 2. Run the update + audit insert below, substituting the email.
-- 3. The user must refresh their session to pick up any future JWT claims.
--    Role checks for MVP read public.profiles.role, not JWT app_metadata.

BEGIN;

UPDATE public.profiles AS p
SET role = 'admin'
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email = 'replace-with-user@example.com'
  AND p.role = 'user';

INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
SELECT p.id, 'bootstrap_admin', 'profile', p.id, jsonb_build_object('via', 'promote_admin.sql')
FROM public.profiles AS p
JOIN auth.users AS u ON u.id = p.id
WHERE u.email = 'replace-with-user@example.com';

COMMIT;
