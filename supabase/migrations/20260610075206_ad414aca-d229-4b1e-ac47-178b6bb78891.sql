
-- 1) Promo codes: remove public SELECT
DROP POLICY IF EXISTS "anyone read active promo codes" ON public.promo_codes;

-- 2) Support threads: restrict insert to authenticated explicitly
DROP POLICY IF EXISTS "users insert own threads" ON public.support_threads;
CREATE POLICY "users insert own threads"
ON public.support_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3) Receipts bucket: replace permissive anon INSERT
DROP POLICY IF EXISTS "anyone can upload receipts" ON storage.objects;

CREATE POLICY "auth users upload own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "guests upload receipts under guest folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = 'guest'
);

-- 4) Broadcast assets: drop blanket SELECT to prevent listing.
-- Bucket remains public so direct file URLs still work via CDN.
DROP POLICY IF EXISTS "broadcast assets public read" ON storage.objects;
