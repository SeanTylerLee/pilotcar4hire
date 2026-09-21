-- Paste into Pilot Car 4 Hire Supabase → SQL Editor → Run.
-- Studio publishes rows here; iOS and Android show a blocking gate until the user clears.

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '',
  message text not null default '',
  image_url text not null default '',
  message_font text not null default 'system',
  message_size text not null default 'medium',
  message_color text not null default '',
  message_blocks jsonb not null default '[]'::jsonb,
  source_studio_id uuid unique,
  created_at timestamptz not null default now()
);

create index if not exists app_announcements_created_idx
  on public.app_announcements (created_at desc);

create table if not exists public.app_announcement_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  announcement_id uuid not null references public.app_announcements (id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

create index if not exists app_announcement_reads_user_idx
  on public.app_announcement_reads (user_id, cleared_at desc);

alter table public.app_announcements enable row level security;
alter table public.app_announcement_reads enable row level security;

drop policy if exists app_announcements_select_all on public.app_announcements;
create policy app_announcements_select_all
  on public.app_announcements for select
  using (true);

drop policy if exists app_announcement_reads_select_own on public.app_announcement_reads;
create policy app_announcement_reads_select_own
  on public.app_announcement_reads for select
  using (auth.uid() = user_id);

drop policy if exists app_announcement_reads_insert_own on public.app_announcement_reads;
create policy app_announcement_reads_insert_own
  on public.app_announcement_reads for insert
  with check (auth.uid() = user_id);

drop policy if exists app_announcement_reads_update_own on public.app_announcement_reads;
create policy app_announcement_reads_update_own
  on public.app_announcement_reads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

grant select on table public.app_announcements to anon, authenticated;
-- Inserts come from Studio via the service_role key only.
revoke insert, update, delete on table public.app_announcements from anon, authenticated;

grant select, insert, update on table public.app_announcement_reads to authenticated;
revoke all on table public.app_announcement_reads from anon;

notify pgrst, 'reload schema';
