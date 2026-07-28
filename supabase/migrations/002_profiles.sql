-- CLINK — account profiles
-- Run this in the Supabase dashboard → SQL Editor, after 001_google_auth.sql.
--
-- One row per Google account: the defaults a person carries between trips
-- (nickname + avatar) plus optional body stats.
--
-- Note this does NOT replace trip_users.display_name / avatar_emoji. Those stay
-- per-trip on purpose — the profile is only what pre-fills them.
--
-- NOTE: trip_users is renamed to event_users by 003_rename_trip_to_event.sql.
-- Nothing in this file touches that table, so the order doesn't matter here.

-- ── 1. Table ─────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  display_name text not null default '',
  avatar_emoji text not null default '🦊',

  -- Birth *year*, not age: an age column is silently wrong from the next
  -- birthday onwards, and nobody ever goes back to edit it.
  birth_year   int          check (birth_year between 1900 and 2100),
  weight_kg    numeric(5,1) check (weight_kg between 20 and 400),
  height_cm    int          check (height_cm between 80 and 260),
  -- Widmark's r-factor differs by sex, so this is here for future drink-pace
  -- estimates. Optional, and never shown to anyone else.
  sex          text         check (sex in ('male', 'female', 'other')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. Grants ────────────────────────────────────────────────────────────────
-- Two separate layers, and both are required. GRANT decides whether the role may
-- touch the table at all; RLS below decides which rows. Without this, clients get
-- "permission denied for table profiles" and the policies never even run.
--
-- The older tables got their grants from Supabase's default privileges, which is
-- easy to assume covers new tables too. It doesn't reliably — be explicit.
--
-- No DELETE: there's no delete policy either, so nothing can remove a profile
-- except deleting the auth user, which cascades.

grant select, insert, update on table public.profiles to authenticated;

-- ── 3. Row Level Security ────────────────────────────────────────────────────
-- Own row only. Trip-mates deliberately cannot read this table: the feed and
-- leaderboard already have everything they need in trip_users, and weight is
-- nobody else's business.

alter table profiles enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── 4. updated_at ────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on profiles;
create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

-- ── 5. Auto-create a profile on sign-up ──────────────────────────────────────
-- SECURITY DEFINER because the trigger runs as the auth service, which is not
-- `authenticated` and so is not covered by the insert policy above.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 6. Backfill anyone who signed in before this migration ───────────────────

insert into profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1),
    ''
  )
from auth.users u
on conflict (id) do nothing;
