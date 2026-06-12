
-- balance_transactions: restrict own-read to authenticated
DROP POLICY IF EXISTS "users read own tx" ON public.balance_transactions;
CREATE POLICY "users read own tx" ON public.balance_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- orders: restrict own-read to authenticated
DROP POLICY IF EXISTS "users read own orders" ON public.orders;
CREATE POLICY "users read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- support_messages: restrict to authenticated for both insert and select
DROP POLICY IF EXISTS "users insert into own thread" ON public.support_messages;
CREATE POLICY "users insert into own thread" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
    AND sender_kind = 'user'
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "users read own thread messages" ON public.support_messages;
CREATE POLICY "users read own thread messages" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

-- support_threads: restrict read/update to authenticated
DROP POLICY IF EXISTS "users read own threads" ON public.support_threads;
CREATE POLICY "users read own threads" ON public.support_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own threads" ON public.support_threads;
CREATE POLICY "users update own threads" ON public.support_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- receipts: allow authenticated owners to read their own receipts (folder = uid)
DROP POLICY IF EXISTS "users read own receipts" ON storage.objects;
CREATE POLICY "users read own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
