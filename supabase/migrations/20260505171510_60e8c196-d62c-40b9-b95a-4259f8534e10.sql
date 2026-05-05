
-- Promokodlar jadvali
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','premium','stars','topup')),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  min_amount numeric NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (active = true);

CREATE POLICY "admins manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_promo_codes BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Promokod ishlatishlari
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid,
  bot_user_id uuid,
  order_id uuid,
  discount_uzs numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_uses_user ON public.promo_code_uses(user_id);
CREATE INDEX idx_promo_uses_promo ON public.promo_code_uses(promo_id);

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own promo uses"
  ON public.promo_code_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins manage promo uses"
  ON public.promo_code_uses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Promokod tekshirish funksiyasi
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code text,
  p_amount numeric,
  p_type text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_promo public.promo_codes;
  v_uses_by_user integer;
  v_discount numeric;
  v_final numeric;
BEGIN
  SELECT * INTO v_promo FROM public.promo_codes
   WHERE upper(code) = upper(p_code) AND active = true;
  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'limit_reached');
  END IF;
  IF v_promo.applies_to <> 'all' AND v_promo.applies_to <> p_type THEN
    RETURN jsonb_build_object('valid', false, 'error', 'wrong_type');
  END IF;
  IF p_amount < v_promo.min_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'min_amount', 'min_amount', v_promo.min_amount);
  END IF;
  IF auth.uid() IS NOT NULL THEN
    SELECT count(*) INTO v_uses_by_user FROM public.promo_code_uses
     WHERE promo_id = v_promo.id AND user_id = auth.uid();
    IF v_uses_by_user >= v_promo.per_user_limit THEN
      RETURN jsonb_build_object('valid', false, 'error', 'already_used');
    END IF;
  END IF;

  IF v_promo.discount_type = 'percent' THEN
    v_discount := round(p_amount * v_promo.discount_value / 100);
  ELSE
    v_discount := v_promo.discount_value;
  END IF;
  IF v_discount > p_amount THEN v_discount := p_amount; END IF;
  v_final := p_amount - v_discount;

  RETURN jsonb_build_object(
    'valid', true,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_uzs', v_discount,
    'final_amount', v_final
  );
END $$;

-- Premium xarid + promokod
CREATE OR REPLACE FUNCTION public.purchase_premium_with_promo(
  p_plan_id uuid,
  p_telegram text,
  p_promo_code text DEFAULT NULL
) RETURNS TABLE(order_id uuid, order_number text, discount_uzs numeric, final_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan public.plans;
  v_profile public.profiles;
  v_oid uuid;
  v_num text;
  v_check jsonb;
  v_discount numeric := 0;
  v_final numeric;
  v_promo_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id AND active = true;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  IF coalesce(p_telegram,'') = '' THEN RAISE EXCEPTION 'Telegram required'; END IF;

  v_final := v_plan.price_uzs;

  IF p_promo_code IS NOT NULL AND length(trim(p_promo_code)) > 0 THEN
    v_check := public.validate_promo_code(p_promo_code, v_plan.price_uzs, 'premium');
    IF NOT (v_check->>'valid')::boolean THEN
      RAISE EXCEPTION 'Promo: %', v_check->>'error';
    END IF;
    v_discount := (v_check->>'discount_uzs')::numeric;
    v_final := (v_check->>'final_amount')::numeric;
    v_promo_id := (v_check->>'promo_id')::uuid;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_profile.balance < v_final THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - v_final WHERE id = auth.uid();

  INSERT INTO public.orders (
    user_id, contact_full_name, contact_phone, contact_telegram, telegram_target,
    plan_id, duration_months, amount_uzs, payment_method, status, source, product_type,
    admin_note
  ) VALUES (
    auth.uid(), v_profile.full_name, v_profile.phone, p_telegram, p_telegram,
    v_plan.id, v_plan.duration_months, v_final, 'balance', 'pending', 'website', 'premium',
    CASE WHEN v_promo_id IS NOT NULL THEN 'Promo: ' || (v_check->>'code') || ' (-' || v_discount || ' UZS)' ELSE NULL END
  ) RETURNING id, orders.order_number INTO v_oid, v_num;

  INSERT INTO public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
  VALUES (auth.uid(), 'premium_purchase', 'approved', -v_final, v_oid, 'Premium ' || v_plan.duration_months || 'mo');

  IF v_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_code_uses (promo_id, user_id, order_id, discount_uzs)
    VALUES (v_promo_id, auth.uid(), v_oid, v_discount);
    UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = v_promo_id;
  END IF;

  RETURN QUERY SELECT v_oid, v_num, v_discount, v_final;
END $$;

-- Stars xarid + promokod
CREATE OR REPLACE FUNCTION public.purchase_stars_with_promo(
  p_stars integer,
  p_telegram text,
  p_promo_code text DEFAULT NULL
) RETURNS TABLE(order_id uuid, order_number text, discount_uzs numeric, final_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rate numeric; v_min integer; v_amount numeric; v_profile public.profiles;
  v_oid uuid; v_num text; v_check jsonb; v_discount numeric := 0; v_final numeric; v_promo_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value::text)::numeric INTO v_rate FROM public.settings WHERE key = 'stars_rate_uzs';
  SELECT (value::text)::integer INTO v_min FROM public.settings WHERE key = 'min_stars';
  IF v_rate IS NULL THEN v_rate := 220; END IF;
  IF v_min IS NULL THEN v_min := 50; END IF;
  IF p_stars < v_min THEN RAISE EXCEPTION 'Below minimum stars'; END IF;
  IF coalesce(p_telegram,'') = '' THEN RAISE EXCEPTION 'Telegram required'; END IF;

  v_amount := v_rate * p_stars;
  v_final := v_amount;

  IF p_promo_code IS NOT NULL AND length(trim(p_promo_code)) > 0 THEN
    v_check := public.validate_promo_code(p_promo_code, v_amount, 'stars');
    IF NOT (v_check->>'valid')::boolean THEN
      RAISE EXCEPTION 'Promo: %', v_check->>'error';
    END IF;
    v_discount := (v_check->>'discount_uzs')::numeric;
    v_final := (v_check->>'final_amount')::numeric;
    v_promo_id := (v_check->>'promo_id')::uuid;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_profile.balance < v_final THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - v_final WHERE id = auth.uid();

  INSERT INTO public.orders (
    user_id, contact_full_name, contact_phone, contact_telegram, telegram_target,
    duration_months, amount_uzs, stars_amount, payment_method, status, source, product_type,
    admin_note
  ) VALUES (
    auth.uid(), v_profile.full_name, v_profile.phone, p_telegram, p_telegram,
    0, v_final, p_stars, 'balance', 'pending', 'website', 'stars',
    CASE WHEN v_promo_id IS NOT NULL THEN 'Promo: ' || (v_check->>'code') || ' (-' || v_discount || ' UZS)' ELSE NULL END
  ) RETURNING id, orders.order_number INTO v_oid, v_num;

  INSERT INTO public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
  VALUES (auth.uid(), 'stars_purchase', 'approved', -v_final, v_oid, p_stars || ' stars');

  IF v_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_code_uses (promo_id, user_id, order_id, discount_uzs)
    VALUES (v_promo_id, auth.uid(), v_oid, v_discount);
    UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = v_promo_id;
  END IF;

  RETURN QUERY SELECT v_oid, v_num, v_discount, v_final;
END $$;

-- Statistika kengaytirildi: top mijozlar + oylik trend
CREATE OR REPLACE FUNCTION public.admin_analytics()
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_bot_users', (SELECT count(*) FROM public.bot_users),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status='pending'),
    'approved_orders', (SELECT count(*) FROM public.orders WHERE status='approved'),
    'revenue_today', (SELECT coalesce(sum(amount_uzs),0) FROM public.orders WHERE status='approved' AND created_at >= date_trunc('day', now())),
    'revenue_month', (SELECT coalesce(sum(amount_uzs),0) FROM public.orders WHERE status='approved' AND created_at >= date_trunc('month', now())),
    'revenue_total', (SELECT coalesce(sum(amount_uzs),0) FROM public.orders WHERE status='approved'),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('date', d, 'revenue', r, 'orders', o) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date AS d,
               sum(amount_uzs) FILTER (WHERE status='approved') AS r,
               count(*) AS o
        FROM public.orders
        WHERE created_at >= now() - interval '30 days'
        GROUP BY 1
      ) t
    ),
    'monthly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('month', m, 'revenue', r, 'orders', o) ORDER BY m), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m,
               sum(amount_uzs) FILTER (WHERE status='approved') AS r,
               count(*) FILTER (WHERE status='approved') AS o
        FROM public.orders
        WHERE created_at >= now() - interval '12 months'
        GROUP BY 1
      ) t
    ),
    'by_product', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('type', product_type, 'count', c, 'revenue', r)), '[]'::jsonb)
      FROM (
        SELECT product_type, count(*) AS c, coalesce(sum(amount_uzs) FILTER (WHERE status='approved'),0) AS r
        FROM public.orders GROUP BY product_type
      ) p
    ),
    'top_customers', (
      SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.total_spent DESC), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(p.full_name, bu.full_name, 'Unknown') AS name,
          coalesce(p.phone, bu.phone, '') AS phone,
          o.user_id IS NOT NULL AS is_web,
          count(*) AS orders_count,
          sum(o.amount_uzs) AS total_spent
        FROM public.orders o
        LEFT JOIN public.profiles p ON p.id = o.user_id
        LEFT JOIN public.bot_users bu ON bu.id = o.bot_user_id
        WHERE o.status = 'approved'
        GROUP BY 1, 2, 3
        ORDER BY total_spent DESC
        LIMIT 10
      ) t
    )
  ) INTO v;
  RETURN v;
END $$;

-- Allow reading new settings keys publicly
DROP POLICY IF EXISTS "anyone can read settings" ON public.settings;
CREATE POLICY "anyone can read settings"
  ON public.settings FOR SELECT
  USING (key = ANY (ARRAY[
    'card_number','card_holder','card_bank','card_enabled','stars_enabled',
    'bot_username','referral_reward','stars_rate_uzs','min_stars','min_topup_uzs','cards',
    'support_telegram','faq_items','terms_text','privacy_text',
    'click_enabled','payme_enabled','uzum_enabled'
  ]));
