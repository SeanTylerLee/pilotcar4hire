-- Paste into Pilot Car 4 Hire Supabase → SQL Editor → Run.
-- Studio Advertisement stores one image URL here. iOS and Android show it on every open until Clear.
-- An empty image_url means the apps do not show an ad.

create table if not exists public.app_advertisement (
  id int primary key default 1,
  image_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint app_advertisement_one_row check (id = 1)
);

insert into public.app_advertisement (id, image_url)
values (1, '')
on conflict (id) do nothing;

alter table public.app_advertisement enable row level security;

drop policy if exists app_advertisement_read on public.app_advertisement;
create policy app_advertisement_read
  on public.app_advertisement
  for select
  to anon, authenticated
  using (true);

revoke all on public.app_advertisement from anon, authenticated;
grant select on public.app_advertisement to anon, authenticated;
grant all on public.app_advertisement to service_role;

notify pgrst, 'reload schema';
