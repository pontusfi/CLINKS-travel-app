@AGENTS.md

# CLINK — Group Drink Tracker

React Native + Expo SDK 54 app. **Primary target is web** (static export → Vercel,
installable as a PWA); native builds still work but aren't the distribution path.

Identity is **Google sign-in via Supabase Auth**, required. Each user then picks a
per-trip nickname + animal emoji, which is what shows in the feed. The older
device-ID identity model is gone; `trip_users.device_id` remains only as a
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
  index.tsx            # Trips dashboard / hero empty state (Create / Join)
  onboarding.tsx       # Onboarding — ?mode=create|join search param
  profile.tsx          # Account profile — nickname, avatar, body stats, sign out
  (trip)/
    _layout.tsx        # Custom tab bar (Feed | Stats), redirects to / if store.trip is null
    feed.tsx           # Live feed + FAB + real-time Supabase subscription
    stats.tsx          # Leaderboard + night arc chart + category breakdown
components/
  LogDrinkSheet.tsx    # BottomSheetModal for logging drinks
  DrinkCategoryPicker.tsx
  FeedItem.tsx
  StatCard.tsx
lib/
  supabase.ts          # createClient + Trip/TripUser/Drink types
  auth.ts              # signInWithGoogle, signOut, cleanAuthUrl
  profile.ts           # loadProfile (get-or-create), saveProfile, ageFromBirthYear
  store.ts             # Zustand: session, authReady, profile, trip, currentUser, tripUsers, drinks, offlineQueue, isOffline
  utils.ts             # generateInviteCode, timeAgo, getOrCreateDeviceId, formatHour, hexToRgba
constants/
  drinks.ts            # DRINK_CATEGORIES, CATEGORY_MAP, AVATAR_OPTIONS, AVATAR_BG_COLORS
supabase/migrations/
  001_google_auth.sql  # user_id/owner_id columns, RLS policies, join_trip_by_code()
  002_profiles.sql     # profiles table, own-row RLS, auto-create trigger on auth.users
docs/
  GOOGLE_AUTH.md       # Google Cloud + Supabase dashboard setup
  DEPLOY.md            # Vercel deploy + env vars + PWA install
```

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
create table trips (id uuid primary key default gen_random_uuid(), name text not null, invite_code text unique not null, created_by uuid not null, owner_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), active boolean default true);
create table trip_users (id uuid primary key default gen_random_uuid(), trip_id uuid references trips(id) on delete cascade, display_name text not null, avatar_emoji text not null, user_id uuid references auth.users(id) on delete cascade, device_id text, joined_at timestamptz default now());
create table drinks (id uuid primary key default gen_random_uuid(), trip_id uuid references trips(id) on delete cascade, user_id uuid references trip_users(id) on delete cascade, category text not null, name text, note text, logged_at timestamptz default now());
create table profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', avatar_emoji text not null default '🦊', birth_year int, weight_kg numeric(5,1), height_cm int, sex text, created_at timestamptz default now(), updated_at timestamptz default now());
```

Enable Realtime on `trips`, `trip_users` and `drinks` in Supabase dashboard →
Database → Replication. `profiles` doesn't need it — it's read once per session.

**`profiles` vs `trip_users`.** `profiles` is one row per Google account and
holds the *defaults* (nickname, avatar) plus private body stats. `trip_users` is
one row per person per trip and is what the feed and leaderboard actually read —
the profile only pre-fills it in `onboarding.tsx`, so changing your profile later
does not rename you in trips you've already joined. `profiles` RLS is own-row
only: trip-mates deliberately cannot read each other's weight.

A trigger on `auth.users` (`handle_new_user`) creates the profile row at sign-up.
`loadProfile()` in `lib/profile.ts` also creates one if it's missing, which is
what covers accounts that existed before migration 002.

⚠️ **Two different `user_id`s.** `trip_users.user_id` → `auth.users` (the Google
account). `drinks.user_id` → `trip_users` (the per-trip persona). They are not
interchangeable; the `drinks` RLS policy joins through `trip_users` to bridge them.

RLS is enabled on all four tables. On the three trip tables every policy is scoped through
`is_trip_member(trip_id)`, a SECURITY DEFINER function. It has to be SECURITY
DEFINER: a `trip_users` policy that queried `trip_users` directly would recurse.

Because `trips` SELECT is restricted to trips you're already in, joining by code
cannot be a plain client query — it goes through the `join_trip_by_code()` RPC.

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
