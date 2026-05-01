-- Allow dev account to delete any gig and related transactions
CREATE OR REPLACE FUNCTION public.is_dev_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = 'gauravgupta926099@gmail.com'
  );
$$;

CREATE POLICY "Dev can delete any gig"
ON public.gigs
FOR DELETE
TO authenticated
USING (public.is_dev_user());

CREATE POLICY "Dev can delete any transaction"
ON public.transactions
FOR DELETE
TO authenticated
USING (public.is_dev_user());
