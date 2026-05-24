
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_segment_bot_users','admin_set_user_banned')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;

  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cancel_pending_order'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
                   r.nspname, r.proname, r.args);
  END LOOP;
END$$;
