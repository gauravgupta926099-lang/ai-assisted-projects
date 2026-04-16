
CREATE OR REPLACE FUNCTION public.award_xp(target_user_id uuid, points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp = xp + points, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;
