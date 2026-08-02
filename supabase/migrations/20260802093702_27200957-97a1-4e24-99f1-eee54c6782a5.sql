
DROP POLICY "admins manage tx" ON public.balance_transactions;
CREATE POLICY "admins manage tx" ON public.balance_transactions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Anyone can view active NFT gifts" ON public.nft_gifts;
CREATE POLICY "Anyone can view active NFT gifts" ON public.nft_gifts FOR SELECT TO anon, authenticated
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "admins manage profiles" ON public.profiles;
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY "admins manage reviews" ON public.reviews;
CREATE POLICY "admins manage reviews" ON public.reviews FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY "anyone read approved reviews" ON public.reviews;
CREATE POLICY "anyone read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (approved = true);
DROP POLICY "users insert own reviews" ON public.reviews;
CREATE POLICY "users insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY "users read own reviews" ON public.reviews;
CREATE POLICY "users read own reviews" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "admins manage stars packages" ON public.stars_packages;
CREATE POLICY "admins manage stars packages" ON public.stars_packages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY "anyone read active stars packages" ON public.stars_packages;
CREATE POLICY "anyone read active stars packages" ON public.stars_packages FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY "admins manage messages" ON public.support_messages;
CREATE POLICY "admins manage messages" ON public.support_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "admins manage threads" ON public.support_threads;
CREATE POLICY "admins manage threads" ON public.support_threads FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
