-- CLINK — closing an event
-- Run this in the Supabase dashboard → SQL Editor, after 006.
--
-- `events.active` has existed since the beginning but nothing ever set it to
-- false, and the dashboard silently filtered inactive events out of existence.
-- Closing an event is now a real action, so this makes the flag mean something:
--
--   1. closed_at, so the Closed list can be ordered by when it actually ended
--      rather than when it started
--   2. drinks can no longer be logged into a closed event — enforced here, not
--      just by hiding the button
--   3. a WITH CHECK on events_update, which was missing

begin;

alter table events add column if not exists closed_at timestamptz;

-- Anything already closed predates the column; date it now rather than leaving
-- a null that the UI would have to special-case.
update events set closed_at = now() where active = false and closed_at is null;

-- ── Is this event still open? ────────────────────────────────────────────────
-- SECURITY DEFINER for the same reason as is_event_member: called from a
-- policy, and a plain query would drag the events select policy in with it on
-- every single insert.

create or replace function public.is_event_active(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select active from events where id = p_event_id), false);
$$;

grant execute on function public.is_event_active(uuid) to authenticated;

-- ── Closed events stop accepting drinks ──────────────────────────────────────
-- The client hides the log button, but that's a courtesy, not a guarantee —
-- a stale tab left open on a since-closed event would otherwise keep posting.

drop policy if exists drinks_insert on drinks;
create policy drinks_insert on drinks
  for insert to authenticated
  with check (
    public.is_event_member(event_id)
    and public.is_event_active(event_id)
    and user_id in (
      select id from event_users
      where event_id = drinks.event_id and user_id = auth.uid()
    )
  );

-- ── Only the owner opens and closes, and stays the owner ─────────────────────
-- The USING clause was already owner-only, but with no WITH CHECK an owner
-- could hand the event to someone else by updating owner_id. Nothing in the
-- app does that; the policy shouldn't permit it either.

drop policy if exists events_update on events;
create policy events_update on events
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
