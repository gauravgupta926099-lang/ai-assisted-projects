-- Replace transactions INSERT policy: allow the acceptor (to_user_id) OR the creator (from_user_id) to create escrow records
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;

CREATE POLICY "Quest parties can create escrow"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Replace UPDATE policy: allow either party to update (poster releases, worker could see status)
DROP POLICY IF EXISTS "Transaction parties can update" ON public.transactions;

CREATE POLICY "Quest parties can update escrow"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);