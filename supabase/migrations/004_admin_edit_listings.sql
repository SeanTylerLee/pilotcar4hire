-- Allow admins to create/update listings for any pilot (help incomplete signups)
-- Requires is_admin_user() from 003_admin_pilot_handoffs.sql

create policy "Admins can insert any listing"
  on public.listings for insert
  with check (public.is_admin_user());

create policy "Admins can update any listing"
  on public.listings for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
