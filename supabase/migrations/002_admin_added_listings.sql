-- Track listings created through the admin onboarding flow
alter table public.listings
  add column if not exists added_by_admin boolean not null default false;

create index if not exists listings_added_by_admin_idx
  on public.listings (added_by_admin)
  where added_by_admin = true;
