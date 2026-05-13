
-- 1. Banned flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- 2. Blog posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read published posts" ON public.blog_posts
  FOR SELECT USING (published = true);
CREATE POLICY "admins manage posts" ON public.blog_posts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_posts_touch
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_posts(published, published_at DESC);

-- 3. Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  display_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read approved reviews" ON public.reviews
  FOR SELECT USING (approved = true);
CREATE POLICY "users read own reviews" ON public.reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage reviews" ON public.reviews
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reviews_touch
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. cancel_pending_order RPC
CREATE OR REPLACE FUNCTION public.cancel_pending_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'Only pending orders can be cancelled'; END IF;

  UPDATE public.orders SET status = 'rejected', admin_note = COALESCE(admin_note,'') || ' [Cancelled by user]' WHERE id = p_order_id;

  IF v_order.payment_method = 'balance' THEN
    UPDATE public.profiles SET balance = balance + v_order.amount_uzs WHERE id = v_order.user_id;
    INSERT INTO public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
    VALUES (v_order.user_id, 'refund', 'approved', v_order.amount_uzs, v_order.id, 'User cancelled order');
  END IF;
END $$;

-- 5. admin_segment_bot_users RPC (returns telegram_id list)
CREATE OR REPLACE FUNCTION public.admin_segment_bot_users(p_filter text)
RETURNS TABLE(telegram_id bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  IF p_filter = 'inactive_30d' THEN
    RETURN QUERY
      SELECT bu.telegram_id FROM public.bot_users bu
      WHERE bu.banned = false
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.bot_user_id = bu.id
            AND o.created_at > now() - interval '30 days'
        );
  ELSIF p_filter = 'premium_buyers' THEN
    RETURN QUERY
      SELECT DISTINCT bu.telegram_id FROM public.bot_users bu
      JOIN public.orders o ON o.bot_user_id = bu.id
      WHERE bu.banned = false AND o.product_type = 'premium' AND o.status = 'approved';
  ELSIF p_filter = 'stars_buyers' THEN
    RETURN QUERY
      SELECT DISTINCT bu.telegram_id FROM public.bot_users bu
      JOIN public.orders o ON o.bot_user_id = bu.id
      WHERE bu.banned = false AND o.product_type = 'stars' AND o.status = 'approved';
  ELSIF p_filter = 'no_purchase' THEN
    RETURN QUERY
      SELECT bu.telegram_id FROM public.bot_users bu
      WHERE bu.banned = false
        AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.bot_user_id = bu.id AND o.status = 'approved');
  ELSE
    RETURN QUERY
      SELECT bu.telegram_id FROM public.bot_users bu WHERE bu.banned = false;
  END IF;
END $$;

-- 6. admin_set_user_banned RPC
CREATE OR REPLACE FUNCTION public.admin_set_user_banned(p_kind text, p_user_id uuid, p_banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_kind = 'web' THEN
    UPDATE public.profiles SET banned = p_banned WHERE id = p_user_id;
  ELSIF p_kind = 'bot' THEN
    UPDATE public.bot_users SET banned = p_banned WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid kind';
  END IF;
END $$;

-- 7. Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
