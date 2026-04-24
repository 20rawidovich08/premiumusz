
-- 1) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  telegram_username text,
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) BALANCE TRANSACTIONS
do $$ begin
  create type public.tx_type as enum ('topup', 'premium_purchase', 'stars_purchase', 'refund', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.balance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type tx_type not null,
  status tx_status not null default 'approved',
  amount_uzs numeric not null,
  receipt_url text,
  order_id uuid,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_btx_user on public.balance_transactions(user_id, created_at desc);
create index if not exists idx_btx_status on public.balance_transactions(status);

alter table public.balance_transactions enable row level security;
drop policy if exists "users read own tx" on public.balance_transactions;
create policy "users read own tx" on public.balance_transactions
  for select using (auth.uid() = user_id);
drop policy if exists "admins manage tx" on public.balance_transactions;
create policy "admins manage tx" on public.balance_transactions
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists btx_touch on public.balance_transactions;
create trigger btx_touch before update on public.balance_transactions
for each row execute function public.touch_updated_at();

-- 3) STARS PACKAGES
create table if not exists public.stars_packages (
  id uuid primary key default gen_random_uuid(),
  stars integer not null check (stars >= 50),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stars_packages enable row level security;
drop policy if exists "anyone read active stars packages" on public.stars_packages;
create policy "anyone read active stars packages" on public.stars_packages
  for select using (active = true);
drop policy if exists "admins manage stars packages" on public.stars_packages;
create policy "admins manage stars packages" on public.stars_packages
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists sp_touch on public.stars_packages;
create trigger sp_touch before update on public.stars_packages
for each row execute function public.touch_updated_at();

insert into public.stars_packages (stars, sort_order)
select * from (values (50,1),(100,2),(250,3),(500,4),(1000,5),(2500,6)) as v(s,o)
where not exists (select 1 from public.stars_packages where stars = v.s);

-- 4) PLANS
delete from public.plans where duration_months = 1;
insert into public.plans (duration_months, price_uzs, price_stars, active)
  select 6, 65000, 600, true
  where not exists (select 1 from public.plans where duration_months = 6);

-- 5) ORDERS
alter table public.orders add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists product_type text not null default 'premium';
alter table public.orders add column if not exists stars_amount integer;
alter table public.orders add column if not exists telegram_target text;

do $$ begin
  alter table public.orders add constraint orders_product_type_chk check (product_type in ('premium','stars','topup'));
exception when duplicate_object then null; end $$;

create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select using (auth.uid() = user_id);

-- 6) SETTINGS
insert into public.settings (key, value) values ('stars_rate_uzs', to_jsonb(220))
  on conflict (key) do nothing;
insert into public.settings (key, value) values ('min_stars', to_jsonb(50)) on conflict (key) do nothing;
insert into public.settings (key, value) values ('min_topup_uzs', to_jsonb(10000)) on conflict (key) do nothing;

drop policy if exists "anyone can read settings" on public.settings;
create policy "anyone can read settings" on public.settings
  for select using (key = any(array[
    'card_number','card_holder','card_bank','card_enabled','stars_enabled',
    'bot_username','referral_reward','stars_rate_uzs','min_stars','min_topup_uzs'
  ]));

-- 7) RPCs
create or replace function public.request_topup(p_amount_uzs numeric, p_receipt_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_min numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select (value::text)::numeric into v_min from public.settings where key = 'min_topup_uzs';
  if v_min is null then v_min := 10000; end if;
  if p_amount_uzs < v_min then raise exception 'Amount below minimum'; end if;
  if coalesce(p_receipt_path,'') = '' then raise exception 'Receipt required'; end if;

  insert into public.balance_transactions (user_id, type, status, amount_uzs, receipt_url)
  values (auth.uid(), 'topup', 'pending', p_amount_uzs, p_receipt_path)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_decide_topup(p_tx_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_tx public.balance_transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into v_tx from public.balance_transactions where id = p_tx_id for update;
  if v_tx is null then raise exception 'Not found'; end if;
  if v_tx.status <> 'pending' then raise exception 'Already processed'; end if;
  if v_tx.type <> 'topup' then raise exception 'Not a topup'; end if;

  if p_approve then
    update public.profiles set balance = balance + v_tx.amount_uzs where id = v_tx.user_id;
    update public.balance_transactions set status = 'approved', admin_note = p_note where id = p_tx_id;
  else
    update public.balance_transactions set status = 'rejected', admin_note = p_note where id = p_tx_id;
  end if;
end; $$;

create or replace function public.purchase_premium_with_balance(p_plan_id uuid, p_telegram text)
returns table(order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare v_plan public.plans; v_profile public.profiles; v_oid uuid; v_num text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_plan from public.plans where id = p_plan_id and active = true;
  if v_plan is null then raise exception 'Invalid plan'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.balance < v_plan.price_uzs then raise exception 'Insufficient balance'; end if;
  if coalesce(p_telegram,'') = '' then raise exception 'Telegram required'; end if;

  update public.profiles set balance = balance - v_plan.price_uzs where id = auth.uid();

  insert into public.orders (
    user_id, contact_full_name, contact_phone, contact_telegram, telegram_target,
    plan_id, duration_months, amount_uzs, payment_method, status, source, product_type
  ) values (
    auth.uid(), v_profile.full_name, v_profile.phone, p_telegram, p_telegram,
    v_plan.id, v_plan.duration_months, v_plan.price_uzs, 'balance', 'pending', 'website', 'premium'
  ) returning id, orders.order_number into v_oid, v_num;

  insert into public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
  values (auth.uid(), 'premium_purchase', 'approved', -v_plan.price_uzs, v_oid, 'Premium ' || v_plan.duration_months || 'mo');

  return query select v_oid, v_num;
end; $$;

create or replace function public.purchase_stars_with_balance(p_stars integer, p_telegram text)
returns table(order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare v_rate numeric; v_min integer; v_amount numeric; v_profile public.profiles; v_oid uuid; v_num text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select (value::text)::numeric into v_rate from public.settings where key = 'stars_rate_uzs';
  select (value::text)::integer into v_min from public.settings where key = 'min_stars';
  if v_rate is null then v_rate := 220; end if;
  if v_min is null then v_min := 50; end if;
  if p_stars < v_min then raise exception 'Below minimum stars'; end if;
  if coalesce(p_telegram,'') = '' then raise exception 'Telegram required'; end if;

  v_amount := v_rate * p_stars;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.balance < v_amount then raise exception 'Insufficient balance'; end if;

  update public.profiles set balance = balance - v_amount where id = auth.uid();

  insert into public.orders (
    user_id, contact_full_name, contact_phone, contact_telegram, telegram_target,
    duration_months, amount_uzs, stars_amount, payment_method, status, source, product_type
  ) values (
    auth.uid(), v_profile.full_name, v_profile.phone, p_telegram, p_telegram,
    0, v_amount, p_stars, 'balance', 'pending', 'website', 'stars'
  ) returning id, orders.order_number into v_oid, v_num;

  insert into public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
  values (auth.uid(), 'stars_purchase', 'approved', -v_amount, v_oid, p_stars || ' stars');

  return query select v_oid, v_num;
end; $$;

create or replace function public.admin_decide_order(p_order_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then raise exception 'Not found'; end if;
  if v_order.status not in ('pending') then raise exception 'Already processed'; end if;

  if p_approve then
    update public.orders set status = 'approved', admin_note = p_note where id = p_order_id;
  else
    update public.orders set status = 'rejected', admin_note = p_note where id = p_order_id;
    if v_order.payment_method = 'balance' and v_order.user_id is not null then
      update public.profiles set balance = balance + v_order.amount_uzs where id = v_order.user_id;
      insert into public.balance_transactions (user_id, type, status, amount_uzs, order_id, admin_note)
      values (v_order.user_id, 'refund', 'approved', v_order.amount_uzs, v_order.id, 'Refund: rejected order');
    end if;
  end if;
end; $$;

create or replace function public.admin_analytics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_bot_users', (select count(*) from public.bot_users),
    'pending_orders', (select count(*) from public.orders where status = 'pending'),
    'approved_orders', (select count(*) from public.orders where status = 'approved'),
    'revenue_today', (select coalesce(sum(amount_uzs),0) from public.orders where status='approved' and created_at >= date_trunc('day', now())),
    'revenue_month', (select coalesce(sum(amount_uzs),0) from public.orders where status='approved' and created_at >= date_trunc('month', now())),
    'revenue_total', (select coalesce(sum(amount_uzs),0) from public.orders where status='approved'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'revenue', r, 'orders', o) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d,
               sum(amount_uzs) filter (where status='approved') as r,
               count(*) as o
        from public.orders
        where created_at >= now() - interval '30 days'
        group by 1
      ) t
    ),
    'by_product', (
      select coalesce(jsonb_agg(jsonb_build_object('type', product_type, 'count', c, 'revenue', r)), '[]'::jsonb)
      from (
        select product_type, count(*) as c, coalesce(sum(amount_uzs) filter (where status='approved'),0) as r
        from public.orders group by product_type
      ) p
    )
  ) into v;
  return v;
end; $$;
