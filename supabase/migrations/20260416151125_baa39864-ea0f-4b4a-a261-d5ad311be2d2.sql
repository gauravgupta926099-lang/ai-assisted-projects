
-- Drop the overly broad SELECT policy
DROP POLICY "Anyone can view proof images" ON storage.objects;

-- Replace with authenticated-only view
CREATE POLICY "Authenticated users can view proof images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'quest-proofs');
