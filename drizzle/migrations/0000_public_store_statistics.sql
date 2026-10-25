CREATE OR REPLACE FUNCTION public.public_store_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registered_users', (SELECT count(*) FROM public.profiles),
    'approved_orders', (SELECT count(*) FROM public.orders WHERE status = 'approved'),
    'stars_packages', (SELECT count(*) FROM public.stars_packages WHERE active = true),
    'premium_plans', (SELECT count(*) FROM public.plans WHERE active = true)
  );
$$;
REVOKE ALL ON FUNCTION public.public_store_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_store_stats() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.public_store_stats() IS 'Public storefront totals only: website accounts, approved orders across channels, active Stars packages and active Premium plans. No customer identifiers or order details.';