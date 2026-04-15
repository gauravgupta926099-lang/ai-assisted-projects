
CREATE TABLE public.gigs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 26.4499,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 80.3319,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view gigs"
  ON public.gigs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create gigs"
  ON public.gigs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their gigs"
  ON public.gigs FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their gigs"
  ON public.gigs FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gigs_updated_at
  BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
