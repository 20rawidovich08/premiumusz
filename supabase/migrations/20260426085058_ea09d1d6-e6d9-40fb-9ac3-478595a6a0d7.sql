CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_user_kind text,
  p_user_id uuid,
  p_delta numeric,
  p_note text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  IF p_user_kind = 'bot' THEN
    UPDATE public.bot_users
    SET balance = balance + p_delta
    WHERE id = p_user_id AND balance + p_delta >= 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found or balance cannot be negative';
    END IF;

    INSERT INTO public.balance_transactions (bot_user_id, type, status, amount_uzs, admin_note)
    VALUES (p_user_id, 'adjustment', 'approved', p_delta, COALESCE(p_note, 'Admin balance adjustment'));
  ELSIF p_user_kind = 'web' THEN
    UPDATE public.profiles
    SET balance = balance + p_delta
    WHERE id = p_user_id AND balance + p_delta >= 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found or balance cannot be negative';
    END IF;

    INSERT INTO public.balance_transactions (user_id, type, status, amount_uzs, admin_note)
    VALUES (p_user_id, 'adjustment', 'approved', p_delta, COALESCE(p_note, 'Admin balance adjustment'));
  ELSE
    RAISE EXCEPTION 'Invalid user kind';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_order(p_order_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_order.status NOT IN ('pending') THEN RAISE EXCEPTION 'Already processed'; END IF;

  IF p_approve THEN
    UPDATE public.orders SET status = 'approved', admin_note = p_note WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET status = 'rejected', admin_note = p_note WHERE id = p_order_id;

    IF v_order.payment_method = 'balance' THEN
      IF v_order.user_id IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + v_order.amount_uzs WHERE id = v_order.user_id;
        INSERT INTO public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
        VALUES (v_order.user_id, 'refund', 'approved', v_order.amount_uzs, v_order.id, 'Refund: rejected order');
      ELSIF v_order.bot_user_id IS NOT NULL THEN
        UPDATE public.bot_users SET balance = balance + v_order.amount_uzs WHERE id = v_order.bot_user_id;
        INSERT INTO public.balance_transactions (bot_user_id, type, status, amount_uzs, order_id, admin_note)
        VALUES (v_order.bot_user_id, 'refund', 'approved', v_order.amount_uzs, v_order.id, 'Refund: rejected order');
      END IF;
    END IF;
  END IF;
END;
$$;