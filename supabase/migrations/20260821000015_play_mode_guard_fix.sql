CREATE OR REPLACE FUNCTION public.tg_marshmallows_user_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'marshmallows_not_user_writable';
  END IF;
  IF NEW.opens_at IS DISTINCT FROM OLD.opens_at
     OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
     OR NEW.reveals_at IS DISTINCT FROM OLD.reveals_at
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_daily IS DISTINCT FROM OLD.is_daily
     OR NEW.daily_on IS DISTINCT FROM OLD.daily_on
     OR NEW.play_mode IS DISTINCT FROM OLD.play_mode
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
    RAISE EXCEPTION 'marshmallow_lifecycle_not_user_writable';
  END IF;
  RETURN NEW;
END;
$$;
