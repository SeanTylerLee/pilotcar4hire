-- Paste into Pilot Car 4 Hire Supabase → SQL Editor → Run.
-- Public visitors submit reviews; they stay pending until STL Studio PC4H Admin accepts them.

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  stars integer not null check (stars >= 1 and stars <= 5),
  comment text not null default '',
  source text not null default 'web' check (source in ('web', 'ios', 'android')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  submitter_ip text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz
);

create index if not exists listing_reviews_listing_status_idx
  on public.listing_reviews (listing_id, status, published_at desc);

create index if not exists listing_reviews_status_created_idx
  on public.listing_reviews (status, created_at desc);

alter table public.listing_reviews enable row level security;

drop policy if exists listing_reviews_select_published on public.listing_reviews;
create policy listing_reviews_select_published
  on public.listing_reviews for select
  using (status = 'published');

grant usage on schema public to anon, authenticated;
grant select on table public.listing_reviews to anon, authenticated;
revoke insert, update, delete on table public.listing_reviews from anon, authenticated;

create or replace function public.submit_listing_review(
  p_listing_id uuid,
  p_stars integer,
  p_comment text default '',
  p_source text default 'web'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ip text;
  v_comment text;
  v_source text;
  v_exists boolean;
  v_pending integer;
  v_recent integer;
begin
  if p_listing_id is null then
    raise exception 'Choose a listing to review.';
  end if;

  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;

  v_comment := left(btrim(coalesce(p_comment, '')), 280);
  v_source := lower(btrim(coalesce(p_source, 'web')));
  if v_source not in ('web', 'ios', 'android') then
    v_source := 'web';
  end if;

  select exists(select 1 from public.listings where id = p_listing_id)
    into v_exists;
  if not v_exists then
    raise exception 'That listing is not available.';
  end if;

  begin
    v_ip := nullif(btrim(split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',',
      1
    )), '');
  exception
    when others then
      v_ip := '';
  end;
  if v_ip is null then
    v_ip := coalesce(host(inet_client_addr()), '');
  end if;

  if v_ip <> '' then
    select count(*) into v_pending
    from public.listing_reviews
    where listing_id = p_listing_id
      and submitter_ip = v_ip
      and status = 'pending'
      and created_at > now() - interval '24 hours';
    if v_pending > 0 then
      raise exception 'You already submitted a review for this listing. It will be published within 24 hours.';
    end if;

    select count(*) into v_recent
    from public.listing_reviews
    where submitter_ip = v_ip
      and created_at > now() - interval '24 hours';
    if v_recent >= 8 then
      raise exception 'Too many reviews submitted. Try again tomorrow.';
    end if;
  end if;

  insert into public.listing_reviews (
    listing_id,
    stars,
    comment,
    source,
    status,
    submitter_ip
  ) values (
    p_listing_id,
    p_stars,
    v_comment,
    v_source,
    'pending',
    coalesce(v_ip, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_listing_review(uuid, integer, text, text) from public;
grant execute on function public.submit_listing_review(uuid, integer, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
