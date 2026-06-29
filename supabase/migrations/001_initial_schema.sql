-- Pilot Car 4 Hire — initial schema
-- Run in Supabase Dashboard → SQL Editor (project: PilotCar4Hire)

-- Profiles (pilot car drivers only)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'pilot-car' check (role = 'pilot-car'),
  created_at timestamptz not null default now()
);

-- One listing per pilot car driver
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  years_experience integer not null check (years_experience >= 0),
  phone text not null,
  email text not null,
  services text[] not null default '{}',
  states_certified text[] not null default '{}',
  home_state text not null,
  home_city text not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create index listings_updated_at_idx on public.listings (updated_at desc);
create index listings_states_certified_idx on public.listings using gin (states_certified);
create index listings_home_state_idx on public.listings (home_state);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'pilot-car'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

-- Profiles: public read (for listing contact info), owners can update
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Listings: public read, owners manage their own
create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Users can insert own listing"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own listing"
  on public.listings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own listing"
  on public.listings for delete
  using (auth.uid() = user_id);
