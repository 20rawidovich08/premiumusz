
-- Update settings select policy to include 'cards' key
drop policy if exists "anyone can read settings" on public.settings;
create policy "anyone can read settings"
on public.settings
for select
to public
using (key = ANY (ARRAY[
  'card_number','card_holder','card_bank','card_enabled','stars_enabled',
  'bot_username','referral_reward','stars_rate_uzs','min_stars','min_topup_uzs',
  'cards'
]));

-- Public bucket for broadcast images
insert into storage.buckets (id, name, public)
values ('broadcast-assets', 'broadcast-assets', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "broadcast assets public read" on storage.objects;
create policy "broadcast assets public read"
on storage.objects
for select
to public
using (bucket_id = 'broadcast-assets');

-- Admins can upload/manage
drop policy if exists "broadcast assets admin write" on storage.objects;
create policy "broadcast assets admin write"
on storage.objects
for all
to authenticated
using (bucket_id = 'broadcast-assets' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'broadcast-assets' and public.has_role(auth.uid(), 'admin'));
