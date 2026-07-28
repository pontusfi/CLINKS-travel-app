# Google sign-in setup

The app code is done. These are the dashboard steps that can't be done from the repo.
Do them in order — step 3 depends on knowing your Vercel URL.

## 1. Google Cloud Console — create OAuth credentials

1. Go to <https://console.cloud.google.com/> → create a project (e.g. `clink`).
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name `CLINK`, your email for support + developer contact
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough — don't add more
   - **Test users:** add every friend's Gmail address.
     While the app is in "Testing" only listed users can sign in, and there's a
     100-user cap. That's fine for a friends app and avoids Google's verification
     review. If you'd rather not maintain the list, hit **Publish app** — for
     these basic scopes it goes live without review.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `CLINK web`
   - **Authorised redirect URIs** — add exactly this, from your Supabase project:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     This is Supabase's callback, not your app's. Getting this wrong is the
     single most common cause of `redirect_uri_mismatch`.
4. Copy the **Client ID** and **Client secret**.

## 2. Supabase — enable the provider

1. Supabase dashboard → **Authentication → Sign In / Providers → Google**
2. Toggle on, paste the Client ID and Client secret, save.

## 3. Supabase — allowed redirect URLs

**Authentication → URL Configuration**

- **Site URL:** your production URL, e.g. `https://clink.vercel.app`
- **Redirect URLs:** add each of these on its own line:
  ```
  http://localhost:8081
  http://localhost:8081/**
  https://clink.vercel.app
  https://clink.vercel.app/**
  https://*-<your-vercel-scope>.vercel.app/**
  ```
  The last line covers Vercel preview deploys. Without a matching entry the
  redirect back from Google silently drops you on the sign-in screen again.

## 4. Run the schema migration

Supabase dashboard → **SQL Editor** → paste and run:

```
supabase/migrations/001_google_auth.sql
```

This adds `trip_users.user_id`, `trips.owner_id`, turns on RLS, and creates the
`join_trip_by_code()` function.

> **Heads up:** RLS is currently **off**, so the existing "Bennyboi's trip" test
> data is readable by anyone with the anon key. After the migration, rows with a
> null `user_id` match no policy and become invisible. That's intentional — the
> old device-ID identities can't be mapped to Google accounts. Re-create the trip
> after signing in, or uncomment the `delete` at the bottom of the migration.

## 5. Verify

```bash
npx expo start --web --clear
```

Expected flow: sign-in screen → Continue with Google → Google consent →
back to the trips dashboard → create a trip → pick nickname + emoji.

To confirm RLS actually took, re-run the anon read that currently succeeds:

```bash
curl "https://<ref>.supabase.co/rest/v1/trips?select=*" -H "apikey: <anon-key>"
```

Before the migration this returns your trips. After, it should return `[]` —
the anon key alone no longer grants read access.

## Native (Android / iOS) — not wired up

`signInWithGoogle()` in `lib/auth.ts` throws on native. Web OAuth uses a
full-page redirect that doesn't exist in a native app. To add it later:

1. `npx expo install expo-auth-session expo-web-browser`
2. Create **additional** OAuth clients in Google Cloud — one Android (needs the
   SHA-1 fingerprint from `eas credentials`, so it only exists once you've made a
   build) and one iOS.
3. Add `clink://` (the `scheme` in `app.json`) to Supabase redirect URLs.
4. Swap the native branch to `WebBrowser.openAuthSessionAsync()` and pass the
   returned code to `supabase.auth.exchangeCodeForSession()`.
