
-- Fix function search path
create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Remove permissive order policies
drop policy if exists "anyone can create orders" on public.orders;
drop policy if exists "anyone can read order by number" on public.orders;

-- Remove broad storage select; replace with admin-listing only.
-- Public still gets file access via signed/public URLs since bucket is public.
drop policy if exists "anyone can read receipts" on storage.objects;
create policy "admins list receipts" on storage.objects
  for select to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(), 'admin'));

-- Make bucket NOT public - we'll generate signed URLs instead
update storage.buckets set public = false where id = 'receipts';

-- RPCs for safe public order creation/lookup
create or replace function public.create_website_order(
  p_full_name text,
  p_phone text,
  p_telegram text,
  p_plan_id uuid,
  p_receipt_path text
) returns table (order_number text, id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_plan public.plans;
  v_id uuid;
  v_num text;
  v_card_enabled boolean;
begin
  -- check card enabled
  select (value::text)::boolean into v_card_enabled from public.settings where key = 'card_enabled';
  if v_card_enabled is null then v_card_enabled := true; end if;
  if not v_card_enabled then
    raise exception 'Card payments are disabled';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and active = true;
  if v_plan is null then raise exception 'Invalid plan'; end if;

  if length(coalesce(p_full_name,'')) < 2 or length(coalesce(p_full_name,'')) > 100 then
    raise exception 'Invalid name';
  end if;
  if length(coalesce(p_phone,'')) < 6 or length(coalesce(p_phone,'')) > 20 then
    raise exception 'Invalid phone';
  end if;

  insert into public.orders (
    contact_full_name, contact_phone, contact_telegram,
    plan_id, duration_months, amount_uzs, payment_method, status, receipt_url, source
  ) values (
    p_full_name, p_phone, p_telegram,
    v_plan.id, v_plan.duration_months, v_plan.price_uzs, 'card', 'pending', p_receipt_path, 'website'
  ) returning orders.id, orders.order_number into v_id, v_num;

  return query select v_num, v_id;
end; $$;

grant execute on function public.create_website_order(text,text,text,uuid,text) to anon, authenticated;

create or replace function public.get_order_by_number(p_number text)
returns table (
  order_number text,
  status order_status,
  duration_months int,
  amount_uzs numeric,
  payment_method payment_method,
  created_at timestamptz,
  admin_note text
) language sql security definer stable set search_path = public
as $$
  select order_number, status, duration_months, amount_uzs, payment_method, created_at, admin_note
  from public.orders where order_number = p_number limit 1;
$$;

grant execute on function public.get_order_by_number(text) to anon, authenticated;

-- Signed URL helper for receipts (admin only)
create or replace function public.get_receipt_signed_url(p_path text)
returns text language plpgsql security definer set search_path = public, storage
as $$
declare v_url text; begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * from storage.create_signed_url('receipts', p_path, 3600) into v_url;
  return v_url;
end; $$;
