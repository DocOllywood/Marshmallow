-- Ensure the hosted service-role client can run trusted lifecycle jobs
-- (bypass RLS is not enough without table grants).

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
