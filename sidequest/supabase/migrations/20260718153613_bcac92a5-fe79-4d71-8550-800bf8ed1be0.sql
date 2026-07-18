DROP POLICY IF EXISTS "Authenticated users can upload proof images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view proof images" ON storage.objects;

CREATE POLICY "Quest parties can view proof images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quest-proofs'
  AND EXISTS (
    SELECT 1 FROM public.gigs g
    WHERE g.id::text = (storage.foldername(name))[1]
      AND (auth.uid() = g.creator_id OR auth.uid() = g.accepted_by)
  )
);

CREATE POLICY "Accepted worker can upload proof images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quest-proofs'
  AND EXISTS (
    SELECT 1 FROM public.gigs g
    WHERE g.id::text = (storage.foldername(name))[1]
      AND auth.uid() = g.accepted_by
  )
);
