
-- Add proof and timing columns to gigs
ALTER TABLE public.gigs
  ADD COLUMN proof_note text DEFAULT NULL,
  ADD COLUMN proof_image_url text DEFAULT NULL,
  ADD COLUMN accepted_at timestamp with time zone DEFAULT NULL;

-- Add payment info to profiles
ALTER TABLE public.profiles
  ADD COLUMN payment_info text DEFAULT NULL;

-- Create storage bucket for proof images
INSERT INTO storage.buckets (id, name, public) VALUES ('quest-proofs', 'quest-proofs', true);

-- Storage policies for quest-proofs
CREATE POLICY "Authenticated users can upload proof images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quest-proofs');

CREATE POLICY "Anyone can view proof images"
ON storage.objects FOR SELECT
USING (bucket_id = 'quest-proofs');

-- Allow accepted worker to update gig with proof
CREATE POLICY "Workers can submit proof on their accepted gigs"
ON public.gigs FOR UPDATE TO authenticated
USING (auth.uid() = accepted_by AND status = 'accepted')
WITH CHECK (auth.uid() = accepted_by);
