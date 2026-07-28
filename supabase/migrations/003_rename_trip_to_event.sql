-- CLINK — rename "trip" to "event"
-- Run this in the Supabase dashboard → SQL Editor, after 002_profiles.sql.
--
--   trips             → events
--   trip_users        → event_users
--   *.trip_id         → *.event_id
--   is_trip_member    → is_event_member
--   join_trip_by_code → join_event_by_code
--
-- ORDER MATTERS. Postgres stores policy expressions as parse trees, so they
-- follow a table rename on their own — but function *bodies* are stored as
-- plain text and are only resolved when the function runs. A renamed table
-- would leave is_trip_member() referring to a `trip_users` that no longer
-- exists, and it would fail at call time rather than at migration time. So the
-- functions come down first and go back up last.
--
-- Grants and the realtime publication both track table OIDs, not names, so they
-- survive the rename untouched. No need to re-grant.
--
-- Safe to run twice: every step checks whether it has already happened.

begin;

-- ── 1. Drop the policies and functions that name the old objects ─────────────
-- The policies have to go before the function: they depend on it, so dropping
-- it while they exist would need CASCADE, which is a blunter tool than it looks.

-- `drop policy if exists` only tolerates a missing *policy* — it still errors on
-- a missing table, which is exactly the state a second run would find. Hence
-- the table guards.

do $$
begin
  if to_regclass('public.trips') is not null then
    drop policy if exists trips_select on trips;
    drop policy if exists trips_insert on trips;
    drop policy if exists trips_update on trips;
  end if;

  if to_regclass('public.trip_users') is not null then
    drop policy if exists trip_users_select on trip_users;
    drop policy if exists trip_users_insert on trip_users;
    drop policy if exists trip_users_update on trip_users;
  end if;

  drop policy if exists drinks_select on drinks;
  drop policy if exists drinks_insert on drinks;
  drop policy if exists drinks_delete on drinks;
end $$;

drop function if exists public.is_trip_member(uuid);
drop function if exists public.join_trip_by_code(text, text, text);

-- ── 2. Rename the tables, columns and index ──────────────────────────────────

do $$
begin
  if to_regclass('public.trips') is not null then
    alter table trips rename to events;
  end if;

  if to_regclass('public.trip_users') is not null then
    alter table trip_users rename to event_users;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_users'
      and column_name = 'trip_id'
  ) then
    alter table event_users rename column trip_id to event_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'drinks'
      and column_name = 'trip_id'
  ) then
    alter table drinks rename column trip_id to event_id;
  end if;

  if to_regclass('public.trip_users_trip_user_unique') is not null then
    alter index trip_users_trip_user_unique rename to event_users_event_user_unique;
  end if;
end $$;

-- ── 3. Recreate the membership helper ────────────────────────────────────────
-- Still SECURITY DEFINER, and for the same reason as in 001: an event_users
-- policy that queried event_users directly would recurse.

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from event_users
    where event_id = p_event_id and user_id = auth.uid()
  );
$$;

-- ── 4. Recreate the policies ─────────────────────────────────────────────────

alter table events      enable row level security;
alter table event_users enable row level security;
alter table drinks      enable row level security;

drop policy if exists events_select on events;
create policy events_select on events
  for select to authenticated
  using (public.is_event_member(id));

drop policy if exists events_insert on events;
create policy events_insert on events
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists events_update on events;
create policy events_update on events
  for update to authenticated
  using (owner_id = auth.uid());

drop policy if exists event_users_select on event_users;
create policy event_users_select on event_users
  for select to authenticated
  using (public.is_event_member(event_id));

drop policy if exists event_users_insert on event_users;
create policy event_users_insert on event_users
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists event_users_update on event_users;
create policy event_users_update on event_users
  for update to authenticated
  using (user_id = auth.uid());

drop policy if exists drinks_select on drinks;
create policy drinks_select on drinks
  for select to authenticated
  using (public.is_event_member(event_id));

drop policy if exists drinks_insert on drinks;
create policy drinks_insert on drinks
  for insert to authenticated
  with check (
    public.is_event_member(event_id)
    and user_id in (
      select id from event_users
      where event_id = drinks.event_id and user_id = auth.uid()
    )
  );

drop policy if exists drinks_delete on drinks;
create policy drinks_delete on drinks
  for delete to authenticated
  using (
    user_id in (
      select id from event_users
      where event_id = drinks.event_id and user_id = auth.uid()
    )
  );

-- ── 5. Recreate join-by-code ─────────────────────────────────────────────────

create or replace function public.join_event_by_code(
  p_code text,
  p_display_name text,
  p_avatar_emoji text
)
returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_event
  from events
  where invite_code = upper(trim(p_code)) and active = true;

  if not found then
    -- Client matches on this string; keep it in sync with onboarding.tsx.
    raise exception 'EVENT_NOT_FOUND';
  end if;

  insert into event_users (event_id, display_name, avatar_emoji, user_id)
  values (v_event.id, p_display_name, p_avatar_emoji, auth.uid())
  on conflict (event_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji;

  return v_event;
end;
$$;

grant execute on function public.join_event_by_code(text, text, text) to authenticated;

commit;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select
--   to_regclass('public.events')       is not null as has_events,
--   to_regclass('public.event_users')  is not null as has_event_users,
--   to_regclass('public.trips')        is null     as trips_gone,
--   to_regprocedure('public.is_event_member(uuid)') is not null as has_member_fn,
--   to_regprocedure('public.join_event_by_code(text,text,text)') is not null as has_join_fn;
