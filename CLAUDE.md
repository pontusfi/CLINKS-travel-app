@AGENTS.md

# CLINK — Group Drink Tracker

React Native + Expo SDK 54 app. **Primary target is web** (static export → Vercel,
installable as a PWA); native builds still work but aren't the distribution path.

Identity is **Google sign-in via Supabase Auth**, required. Each user then picks a
per-event nickname + animal emoji, which is what shows in the feed. The older
device-ID identity model is gone; `event_users.device_id` remains only as a
nullable legacy column.

## Stack

- **Expo SDK 54** / **Expo Router v6** (file-based navigation, `expo-router/entry` entrypoint)
- **React 19.1.0** / **React Native 0.81.5**
- **react-native-reanimated ~4.1.1** + **react-native-worklets 0.5.1** (exact pin — see note below)
- **NativeWind v4** + **Tailwind v3** — configured via `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `global.css`
- **Zustand v5** — store in `lib/store.ts`, persisted to AsyncStorage
- **Supabase** — client in `lib/supabase.ts`, reads `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`
- **@gorhom/bottom-sheet v5** — LogDrinkSheet, requires `BottomSheetModalProvider` at root
- **Space Grotesk + Space Mono** — loaded via `@expo-google-fonts/*` with `useFonts` in `app/_layout.tsx`

## Running

```
npx expo start --clear
```

Use `--clear` after any dependency or babel config change to avoid stale bundler cache.

Credentials go in `.env.local` (gitignored). Without them the app compiles but DB calls fail.

### Installing packages

Use `npx expo install <package>` (not plain `npm install`) so Expo resolves the SDK-compatible version. If plain `npm install` is needed, add `--legacy-peer-deps` due to a `react-dom` peer conflict in the tree.

### ⚠️ react-native-worklets version lock

`react-native-worklets` is pinned to exactly `0.5.1` in `package.json` (with a matching `"overrides"` entry). **Do not upgrade it.**

Expo Go SDK 54 has `react-native-worklets@0.5.1` compiled into its native binary. The `installTurboModule` native API changed between 0.5.x and 0.8.x, so running a newer JS version against the Expo Go native module causes an immediate crash. If you need a newer version of worklets you must create a development build (`npx expo run:android` / `npx expo run:ios`) instead of using Expo Go.

The babel plugin is `react-native-worklets/plugin` (not the old `react-native-reanimated/plugin`).

## Project structure

```
app/
  _layout.tsx          # Root: GestureHandlerRootView + BottomSheetModalProvider + fonts + NetInfo + AuthGate
  +html.tsx            # Web-only HTML shell (PWA manifest, theme colour, Apple meta). Needs web.output="static"
  sign-in.tsx          # Google sign-in gate — shown whenever there's no session
  (tabs)/
    _layout.tsx        # THE app-wide bottom nav: Profile | Events | Drinks
    profile.tsx        # Account profile — nickname, avatar, body stats, sign out
    drinks.tsx         # Drink presets — save "the usual", one tap to log it
    (events)/
      _layout.tsx      # Stack, so feed/stats/onboarding push *inside* the tab
      index.tsx        # Events dashboard / hero empty state (Create / Join)  → "/"
      feed.tsx         # Live feed + FAB + real-time Supabase subscription    → "/feed"
      stats.tsx        # Leaderboard + night arc + category breakdown         → "/stats"
      onboarding.tsx   # Create / join — ?mode=create|join search param
components/
  LogDrinkSheet.tsx    # BottomSheetModal for logging drinks (+ preset quick-picks)
  DrinkCategoryPicker.tsx
  EventNav.tsx         # Back button + Feed/Stats segmented control
  BackButton.tsx       # Back with a fallback route — router.back() no-ops on a fresh load
  FeedItem.tsx
  StatCard.tsx
lib/
  supabase.ts          # createClient + Event/EventUser/Drink/Profile types
  auth.ts              # signInWithGoogle, signOut, cleanAuthUrl
  profile.ts           # loadProfile (get-or-create), saveProfile, ageFromBirthYear
  presets.ts           # listPresets, createPreset, deletePreset
  store.ts             # Zustand: session, authReady, profile, event, currentUser, eventUsers, drinks, offlineQueue, isOffline
  utils.ts             # generateInviteCode, timeAgo, getOrCreateDeviceId, formatHour, hexToRgba
constants/
  drinks.ts            # DRINK_CATEGORIES, CATEGORY_MAP, AVATAR_OPTIONS, AVATAR_BG_COLORS
supabase/migrations/
  001_google_auth.sql  # user_id/owner_id columns, RLS policies, join-by-code RPC
  002_profiles.sql     # profiles table, grants, own-row RLS, auto-create trigger
  003_rename_trip_to_event.sql  # trips→events, trip_users→event_users, trip_id→event_id
  004_grants.sql       # table + function grants to `authenticated` (see grants note below)
  005_fix_select_policies.sql  # let owners see their own event / membership row
  006_drink_presets.sql # drink_presets table, grants, own-row RLS
docs/
  GOOGLE_AUTH.md       # Google Cloud + Supabase dashboard setup
  DEPLOY.md            # Vercel deploy + env vars + PWA install
```

## Navigation

Three permanent bottom tabs — **Profile | Events | Drinks** — defined in
`app/(tabs)/_layout.tsx`. Everything a signed-in user can reach lives under
`(tabs)`, so the bar never disappears mid-flow.

The key structural decision: the feed, stats and create/join screens are a
**Stack inside the Events tab** (`app/(tabs)/(events)/`), not routes pushed at
the root. Pushing at the root would cover the tab bar. Being a stack is also
what makes `router.back()` meaningful on those screens.

Both `(tabs)` and `(events)` are groups, so they contribute nothing to the URL:
the routes stay `/`, `/feed`, `/stats`, `/onboarding`, `/drinks`, `/profile`.

Feed and Stats used to be their own bottom tab bar. They're a segmented control
in `EventNav` now — the bottom of the screen belongs to the app-wide nav.

⚠️ **`router.back()` alone isn't enough on web.** Open `/feed` directly, or
refresh on it, and there's no history entry — `back()` silently does nothing and
the button looks broken. `BackButton` takes a `fallback` route and uses
`router.canGoBack()` to choose. Use it rather than a bare `router.back()`.

⚠️ **The tab bar is `position: absolute`,** so it floats over content. Any
scrollable or bottom-anchored area has to reserve `80 + max(0, insets.bottom - 20)`
or its last row hides underneath.

## Drink presets

Account-scoped saved drinks (`drink_presets`), surfaced in two places: the
Drinks tab to manage them, and a horizontal quick-pick row at the top of
`LogDrinkSheet` where you're already logging. Logging a preset writes an
ordinary `drinks` row — nothing downstream knows presets exist.

Logging goes through **`store.logDrink()`**, not through the components. It
owns the optimistic insert, the local→server row swap and the offline-queue
fallback, so the sheet and the Drinks tab can't drift apart. The swap matters:
the realtime subscription also delivers the inserted row, and `addDrink` dedupes
on id, so without replacing the `local-…` placeholder the feed shows the drink
twice.

## Design tokens

| Token | Value |
|---|---|
| Background | `#0B0A12` |
| Card | `#15131D` |
| Sheet | `#16141F` |
| Text primary | `#F5F3FA` |
| Text secondary | `#B6B0C8` |
| Text muted | `#6B6680` |
| Accent purple | `#9B5CFF` |
| Accent pink | `#FF3D8B` |
| Lime | `#C6FF4D` |
| Live green | `#6BE58A` |
| Gradient | `#9B5CFF → #FF3D8B` (135deg) |

All styling uses `StyleSheet.create` (not NativeWind className). Gradients use `expo-linear-gradient`.

## Supabase schema

```sql
create table events (id uuid primary key default gen_random_uuid(), name text not null, invite_code text unique not null, created_by uuid not null, owner_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), active boolean default true);
create table event_users (id uuid primary key default gen_random_uuid(), event_id uuid references events(id) on delete cascade, display_name text not null, avatar_emoji text not null, user_id uuid references auth.users(id) on delete cascade, device_id text, joined_at timestamptz default now());
create table drinks (id uuid primary key default gen_random_uuid(), event_id uuid references events(id) on delete cascade, user_id uuid references event_users(id) on delete cascade, category text not null, name text, note text, logged_at timestamptz default now());
create table profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', avatar_emoji text not null default '🦊', birth_year int, weight_kg numeric(5,1), height_cm int, sex text, created_at timestamptz default now(), updated_at timestamptz default now());
create table drink_presets (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, category text not null, created_at timestamptz default now());
```

Enable Realtime on `events`, `event_users` and `drinks` in Supabase dashboard →
Database → Replication. `profiles` doesn't need it — it's read once per session.

**`profiles` vs `event_users`.** `profiles` is one row per Google account and
holds the *defaults* (nickname, avatar) plus private body stats. `event_users` is
one row per person per event and is what the feed and leaderboard actually read —
the profile only pre-fills it in `onboarding.tsx`, so changing your profile later
does not rename you in events you've already joined. `profiles` RLS is own-row
only: fellow attendees deliberately cannot read each other's weight.

⚠️ **Grants and RLS are separate gates, and both must open.** GRANT decides
whether a role may touch the table at all — missing it fails with `permission
denied for table …` (42501) *before* any policy runs. RLS decides which rows —
missing it shows up as empty results or a policy-violation error. They fail
differently; don't debug one while looking at the other.

Every table needed an explicit grant to `authenticated` (`004_grants.sql`). The
pre-auth app ran as `anon`, which had grants from Supabase's default privileges,
so nothing was obviously wrong until requiring sign-in switched every request to
`authenticated`. Keep grants mirroring the policies: no DELETE grant on a table
with no delete policy.

A trigger on `auth.users` (`handle_new_user`) creates the profile row at sign-up.
`loadProfile()` in `lib/profile.ts` also creates one if it's missing, which is
what covers accounts that existed before migration 002.

⚠️ **Two different `user_id`s.** `event_users.user_id` → `auth.users` (the Google
account). `drinks.user_id` → `event_users` (the per-event persona). They are not
interchangeable; the `drinks` RLS policy joins through `event_users` to bridge them.

RLS is enabled on all four tables. On the three event tables every policy is scoped through
`is_event_member(event_id)`, a SECURITY DEFINER function. It has to be SECURITY
DEFINER: an `event_users` policy that queried `event_users` directly would recurse.

⚠️ **`.insert(...).select()` needs a SELECT policy that covers the new row.**
PostgREST's `.select()` is a RETURNING clause, and RETURNING applies the select
policy to the row just written. A membership-only policy fails here: when you
create an event you aren't a member of it yet, and `is_event_member()` is STABLE
so it can't see the membership row being inserted in the same statement either.
Hence the `or owner_id = auth.uid()` / `or user_id = auth.uid()` arms added in
005. Symptom is `new row violates row-level security policy`, which reads like
the INSERT was rejected even though it's the read-back that failed.

Because `events` SELECT is restricted to events you're already in, joining by code
cannot be a plain client query — it goes through the `join_event_by_code()` RPC.

⚠️ **Function bodies are stored as text, not parse trees.** Policies follow a
`rename table` on their own; `is_event_member()` and `join_event_by_code()` do
not, and would fail at call time rather than at migration time. That's why 003
drops and recreates them instead of renaming.

## Key patterns

- **Invite code**: 6-char uppercase alphanumeric, generated by `generateInviteCode()` in `lib/utils.ts`
- **Auth gate**: `AuthGate` in `app/_layout.tsx` redirects to `/sign-in` whenever
  `session` is null, and bounces back to `/` once it isn't. It renders a spinner
  until `authReady` so the sign-in screen doesn't flash on reload.
- **`detectSessionInUrl`** is on for web only (`lib/supabase.ts`). The Google
  redirect returns tokens in the URL and supabase-js must read them — with this
  off, sign-in appears to do nothing.
- **SSR guard**: `web.output: "static"` imports this code in Node during build,
  where `window` doesn't exist. `lib/supabase.ts` passes `storage: undefined` on
  the server; without that the build crashes in AsyncStorage.
- **Session is not persisted by Zustand** — supabase-js already owns that. It's
  deliberately excluded from `partialize` in `lib/store.ts`.
- **Offline**: drinks are inserted optimistically into Zustand; if offline they go to `offlineQueue` and are flushed by `flushOfflineQueue()` when NetInfo reports reconnection (wired in `app/_layout.tsx`)
- **Real-time**: Supabase channel subscribed in `feed.tsx` `useEffect`, cleaned up on unmount
- **Font names**: `SpaceGrotesk`, `SpaceGrotesk_Medium`, `SpaceGrotesk_Bold`, `SpaceMono`, `SpaceMono_Bold`
