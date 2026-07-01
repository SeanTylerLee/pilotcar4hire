-- Temporary login credentials for pilots added by admin (admin-only, not public)
create table if not exists public.admin_pilot_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  contact_name text not null,
  login_email text not null,
  temp_password text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_pilot_handoffs_created_at_idx
  on public.admin_pilot_handoffs (created_at desc);

alter table public.admin_pilot_handoffs enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    lower('seantylerlee@outlook.com')
  );
$$;

create policy "Admins can view pilot handoffs"
  on public.admin_pilot_handoffs for select
  using (public.is_admin_user());

create policy "Admins can insert pilot handoffs"
  on public.admin_pilot_handoffs for insert
  with check (public.is_admin_user());

create policy "Admins can delete pilot handoffs"
  on public.admin_pilot_handoffs for delete
  using (public.is_admin_user());
