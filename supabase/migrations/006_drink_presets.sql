-- CLINK — saved drink presets
-- Run this in the Supabase dashboard → SQL Editor, after 005.
--
-- A preset is "the thing I always order" — a name plus a category — so logging
-- a repeat round is one tap instead of typing it out again.
--
-- Presets belong to the *account*, not to an event, so they follow you between
-- events the way the profile does. Logging one still writes an ordinary row to
-- `drinks`; nothing downstream (feed, stats, leaderboard) needs to know presets
-- exist.

begin;

create table if not exists drink_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null check (length(trim(name)) between 1 and 40),
  -- Mirrors DrinkCategory in constants/drinks.ts. Kept as a check constraint
  -- rather than an enum so adding a category is a one-line migration.
  category text not null check (category in ('beer', 'wine', 'shot', 'cocktail', 'soft', 'other')),

  created_at timestamptz not null default now()
);

create index if not exists drink_presets_user_idx on drink_presets (user_id, created_at);

-- Same name twice in one account is a mistake, not a feature.
create unique index if not exists drink_presets_user_name_unique
  on drink_presets (user_id, lower(trim(name)));

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Explicit, for the reason spelled out in 004: policies without grants fail at
-- a different gate with a different error, and default privileges don't
-- reliably cover a new table.

grant select, insert, update, delete on table public.drink_presets to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Own rows only. Presets are personal; nobody else has any business reading
-- them, and no other table joins to them.

alter table drink_presets enable row level security;

drop policy if exists drink_presets_select on drink_presets;
create policy drink_presets_select on drink_presets
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists drink_presets_insert on drink_presets;
create policy drink_presets_insert on drink_presets
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists drink_presets_update on drink_presets;
create policy drink_presets_update on drink_presets
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists drink_presets_delete on drink_presets;
create policy drink_presets_delete on drink_presets
  for delete to authenticated
  using (user_id = auth.uid());

commit;

-- Note the select policy covers the row a client just inserted (user_id is
-- auth.uid() by definition), so `.insert(...).select()` works here — unlike the
-- membership-scoped policies that 005 had to fix.
