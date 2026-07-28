-- CLINK — Google auth migration
-- Run this in the Supabase dashboard → SQL Editor.
--
-- What it does:
--   1. Adds trip_users.user_id → auth.users(id) as the new identity
--   2. Repoints trips.created_by from a device UUID to an auth user
--   3. Turns on RLS with policies scoped to trip membership
--   4. Adds join_trip_by_code() so joining doesn't require read access to all trips

-- ── 1. Identity columns ──────────────────────────────────────────────────────

alter table trip_users
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- device_id stays (nullable) so existing rows survive; it is no longer identity.
alter table trip_users alter column device_id drop not null;

-- One row per person per trip.
create unique index if not exists trip_users_trip_user_unique
  on trip_users (trip_id, user_id);

alter table trips
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- ── 2. Membership helper ─────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS inside the function. This matters: without it,
-- the trip_users SELECT policy would query trip_users and recurse infinitely.

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from trip_users
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- ── 3. Row Level Security ────────────────────────────────────────────────────

alter table trips      enable row level security;
alter table trip_users enable row level security;
alter table drinks     enable row level security;

-- trips: you can only see trips you're in; you can only create trips you own.
drop policy if exists trips_select on trips;
create policy trips_select on trips
  for select to authenticated
  using (public.is_trip_member(id));

drop policy if exists trips_insert on trips;
create policy trips_insert on trips
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists trips_update on trips;
create policy trips_update on trips
  for update to authenticated
  using (owner_id = auth.uid());

-- trip_users: see everyone in your trips; only ever insert yourself.
drop policy if exists trip_users_select on trip_users;
create policy trip_users_select on trip_users
  for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists trip_users_insert on trip_users;
create policy trip_users_insert on trip_users
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists trip_users_update on trip_users;
create policy trip_users_update on trip_users
  for update to authenticated
  using (user_id = auth.uid());

-- drinks: read anything in your trips, but only log drinks as yourself.
drop policy if exists drinks_select on drinks;
create policy drinks_select on drinks
  for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists drinks_insert on drinks;
create policy drinks_insert on drinks
  for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and user_id in (
      select id from trip_users
      where trip_id = drinks.trip_id and user_id = auth.uid()
    )
  );

drop policy if exists drinks_delete on drinks;
create policy drinks_delete on drinks
  for delete to authenticated
  using (
    user_id in (
      select id from trip_users
      where trip_id = drinks.trip_id and user_id = auth.uid()
    )
  );

-- ── 4. Join by invite code ───────────────────────────────────────────────────
-- The trips SELECT policy deliberately hides trips you're not in, so a client
-- cannot look one up by code. This function does it server-side instead.

create or replace function public.join_trip_by_code(
  p_code text,
  p_display_name text,
  p_avatar_emoji text
)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip trips;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_trip
  from trips
  where invite_code = upper(trim(p_code)) and active = true;

  if not found then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  insert into trip_users (trip_id, display_name, avatar_emoji, user_id)
  values (v_trip.id, p_display_name, p_avatar_emoji, auth.uid())
  on conflict (trip_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji;

  return v_trip;
end;
$$;

grant execute on function public.join_trip_by_code(text, text, text) to authenticated;

-- ── 5. Legacy data ───────────────────────────────────────────────────────────
-- Pre-auth rows have user_id = null and are now unreachable (no policy matches).
-- They're harmless. To clear the old test trip instead, uncomment:
--
-- delete from trips where owner_id is null;
