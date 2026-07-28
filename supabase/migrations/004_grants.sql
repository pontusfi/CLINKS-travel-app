-- CLINK — grant table privileges to `authenticated`
-- Run this in the Supabase dashboard → SQL Editor, after 003.
--
-- WHY THIS EXISTS
--
-- Postgres has two independent gates and both must open:
--
--   GRANT  — may this role touch this table at all?   → "permission denied for
--            table x" (SQLSTATE 42501) when it's missing
--   RLS    — which rows of it may this role see?      → empty results, or
--            "new row violates row-level security policy"
--
-- 001 turned on RLS and wrote careful policies, but never granted anything. It
-- looked fine because the pre-auth app talked to Supabase as `anon`, which had
-- grants from Supabase's default privileges. Requiring Google sign-in switched
-- every request to `authenticated`, which did not — so every query had been
-- failing at the GRANT gate, before RLS was ever consulted.
--
-- It stayed invisible because the dashboard query ignored its own error, and a
-- failed select looks exactly like "you have no events".
--
-- The grants below deliberately mirror the policies in 003 and 002: no DELETE
-- on events, event_users or profiles, because there is no delete policy for
-- them either. Adding a grant without a matching policy buys nothing; adding a
-- policy without the grant is what got us here.

begin;

grant usage on schema public to authenticated;

grant select, insert, update         on table public.events      to authenticated;
grant select, insert, update         on table public.event_users to authenticated;
grant select, insert, update, delete on table public.drinks      to authenticated;
grant select, insert, update         on table public.profiles    to authenticated;

-- EXECUTE is granted to PUBLIC by default, so these are belt-and-braces against
-- a project that has had that default revoked.
grant execute on function public.is_event_member(uuid) to authenticated;
grant execute on function public.join_event_by_code(text, text, text) to authenticated;

-- Stops the next table from repeating this. Caveat: default privileges are
-- per-creating-role, so this only covers tables created by the role running it
-- (the SQL editor's role). A table created by some other role still needs its
-- own grant — which is why 002 and this file grant explicitly rather than
-- relying on it.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

commit;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Expect one row per table for `authenticated`:
--
-- select table_name, grantee,
--        string_agg(privilege_type, ', ' order by privilege_type) as privileges
-- from information_schema.role_table_grants
-- where table_schema = 'public' and grantee in ('anon', 'authenticated')
-- group by table_name, grantee
-- order by table_name, grantee;
