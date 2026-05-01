REVOKE EXECUTE ON FUNCTION public.is_dev_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dev_user() TO authenticated;
