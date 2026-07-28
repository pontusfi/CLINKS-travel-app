-- CLINK — let people see their own rows
-- Run this in the Supabase dashboard → SQL Editor, after 004.
--
-- THE BUG
--
-- Creating an event is two inserts: the event, then your event_users row. The
-- select policies were both written purely in terms of membership:
--
--   events_select       using (is_event_member(id))
--   event_users_select  using (is_event_member(event_id))
--
-- At the moment the event is inserted you are not yet a member of it — the row
-- that makes you one doesn't exist until the next statement. So the event is
-- invisible to you the instant after you create it.
--
-- That matters because the client uses `.insert(...).select().single()`, and
-- PostgREST's `.select()` is a RETURNING clause. RETURNING applies the *select*
-- policy to the new row, so the insert lands and then the read of it is denied.
--
-- The event_users insert has the same problem for a subtler reason:
-- is_event_member() is STABLE, so it runs against the snapshot taken at the
-- start of the statement, which does not contain the row currently being
-- inserted. It cannot see the very membership it is being asked about.
--
-- THE FIX
--
-- Add the self-referential arm each policy was missing. Neither widens access
-- in any meaningful sense — the owner of an event is by definition someone who
-- may see it, and being able to read your own membership row is not a
-- disclosure. Everyone else still goes through is_event_member().

begin;

drop policy if exists events_select on events;
create policy events_select on events
  for select to authenticated
  using (
    public.is_event_member(id)
    or owner_id = auth.uid()
  );

drop policy if exists event_users_select on event_users;
create policy event_users_select on event_users
  for select to authenticated
  using (
    public.is_event_member(event_id)
    or user_id = auth.uid()
  );

commit;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Shows every policy actually installed, which is worth checking directly
-- rather than assuming the migrations left what they intended:
--
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('events', 'event_users', 'drinks', 'profiles')
-- order by tablename, cmd, policyname;
