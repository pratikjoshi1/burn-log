-- Burn Log cloud sync. Paste into Supabase: SQL Editor > New query > Run.
-- One row per workout, lifting session, or profile, owned by the signed-in user.
create table if not exists public.burnlog_records (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('workouts', 'sessions', 'profile')),
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

alter table public.burnlog_records enable row level security;

drop policy if exists "burnlog read own"   on public.burnlog_records;
drop policy if exists "burnlog insert own" on public.burnlog_records;
drop policy if exists "burnlog update own" on public.burnlog_records;
drop policy if exists "burnlog delete own" on public.burnlog_records;
create policy "burnlog read own"   on public.burnlog_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "burnlog insert own" on public.burnlog_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "burnlog update own" on public.burnlog_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "burnlog delete own" on public.burnlog_records for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.burnlog_records to authenticated;
revoke all on public.burnlog_records from anon;

create or replace function public.burnlog_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists burnlog_touch on public.burnlog_records;
create trigger burnlog_touch before update on public.burnlog_records
for each row execute function public.burnlog_touch();
