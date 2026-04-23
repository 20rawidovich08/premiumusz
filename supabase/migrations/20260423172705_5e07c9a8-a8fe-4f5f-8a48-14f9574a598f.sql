
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- BOT USERS (telegram users, not auth users)
create table public.bot_users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  full_name text,
  phone text,
  language text not null default 'uz',
  balance numeric not null default 0,
  banned boolean not null default false,
  referral_code text not null unique default substr(md5(random()::text), 1, 8),
  referred_by uuid references public.bot_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bot_users enable row level security;
create policy "admins manage bot users" on public.bot_users
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PLANS
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  duration_months int not null unique,
  price_uzs numeric not null,
  price_stars int not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create policy "anyone can read active plans" on public.plans
  for select to anon, authenticated using (active = true);
create policy "admins manage plans" on public.plans
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ORDERS
create type public.order_status as enum ('pending', 'approved', 'rejected', 'paid');
create type public.payment_method as enum ('card', 'stars', 'balance');
create type public.order_source as enum ('bot', 'website');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default 'TP-' || upper(substr(md5(random()::text), 1, 8)),
  bot_user_id uuid references public.bot_users(id) on delete set null,
  -- For website-only orders without telegram registration
  contact_full_name text,
  contact_phone text,
  contact_telegram text,
  plan_id uuid references public.plans(id),
  duration_months int not null,
  amount_uzs numeric,
  amount_stars int,
  payment_method payment_method not null,
  status order_status not null default 'pending',
  receipt_url text,
  source order_source not null default 'bot',
  stars_charge_id text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "anyone can create orders" on public.orders
  for insert to anon, authenticated with check (true);
create policy "anyone can read order by number" on public.orders
  for select to anon, authenticated using (true);
create policy "admins manage orders" on public.orders
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- SETTINGS (single-row key/value)
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
create policy "anyone can read settings" on public.settings
  for select to anon, authenticated using (key in ('card_number','card_holder','card_bank','card_enabled','stars_enabled','bot_username','referral_reward'));
create policy "admins manage settings" on public.settings
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- BROADCASTS
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  sent_count int not null default 0,
  failed_count int not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
create policy "admins manage broadcasts" on public.broadcasts
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- REFERRAL EVENTS
create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.bot_users(id) on delete cascade,
  referred_id uuid references public.bot_users(id) on delete cascade,
  reward numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.referral_events enable row level security;
create policy "admins read referrals" on public.referral_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger t_bot_users_updated before update on public.bot_users for each row execute function public.touch_updated_at();
create trigger t_orders_updated before update on public.orders for each row execute function public.touch_updated_at();
create trigger t_plans_updated before update on public.plans for each row execute function public.touch_updated_at();
create trigger t_settings_updated before update on public.settings for each row execute function public.touch_updated_at();

-- STORAGE: receipts bucket
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
  on conflict (id) do nothing;

create policy "anyone can upload receipts" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'receipts');
create policy "anyone can read receipts" on storage.objects
  for select to anon, authenticated using (bucket_id = 'receipts');
create policy "admins delete receipts" on storage.objects
  for delete to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(), 'admin'));

-- Indexes
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);
create index idx_bot_users_tg on public.bot_users(telegram_id);
