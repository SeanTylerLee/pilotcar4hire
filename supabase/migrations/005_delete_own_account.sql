-- Allow a signed-in pilot to permanently delete their own account.
-- Deleting auth.users cascades to profiles, listings, and admin_pilot_handoffs.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

alter function public.delete_own_account() owner to postgres;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated, service_role;

notify pgrst, 'reload schema';
