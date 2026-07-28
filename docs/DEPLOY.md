# Deploying to Vercel

The app builds to a static site — no server, no Node runtime, free tier is plenty.

## Config already in the repo

`vercel.json` sets:
- build command `npx expo export --platform web`, output `dist/`
- long-lived caching for hashed assets under `/_expo/static/`, no-cache on HTML
- a catch-all rewrite to `/index.html` so client-side routes don't 404 on refresh

`app.json` uses `web.output: "static"`, which pre-renders each route to its own
HTML file. That's what makes `app/+html.tsx` (PWA manifest link, theme colour,
Apple meta tags) actually apply — it is ignored in `"single"` mode.

## First deploy

```bash
npm i -g vercel
vercel login
vercel          # preview deploy
vercel --prod   # production
```

Or connect the GitHub repo at <https://vercel.com/new> and it'll deploy on every
push to `main`. Vercel reads `vercel.json`, so no dashboard build config needed.

## Environment variables — required

`.env.local` is gitignored, so **Vercel will not have your Supabase keys** unless
you add them. Project → **Settings → Environment Variables**, for all three
environments (Production, Preview, Development):

| Name | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

Without these the build succeeds but every DB call fails at runtime — a blank
trips list and no error, which is a confusing way to find out.

> `EXPO_PUBLIC_` variables are inlined into the JS bundle and are readable by
> anyone who opens devtools. That's expected for the anon key, and it's exactly
> why the RLS policies in `supabase/migrations/001_google_auth.sql` matter — they,
> not the key's secrecy, are what protect the data.

## After deploying

Add the production URL to Supabase → **Authentication → URL Configuration**
(both Site URL and Redirect URLs). See `docs/GOOGLE_AUTH.md` step 3. Google
sign-in will fail until you do.

## Telling friends to install it

Send the URL. It works in the browser as-is, but installing gets it a home
screen icon and drops the browser chrome:

- **iPhone (Safari):** Share → Add to Home Screen. Must be Safari — Chrome on
  iOS can't install PWAs.
- **Android (Chrome):** an "Install app" prompt appears automatically, or
  ⋮ menu → Add to Home screen.

### Known limitation worth planning around

iOS clears a website's local storage after ~7 days without a visit. For an
*installed* PWA this is much less aggressive, but it can still happen. If it
does, the Supabase session is lost and they sign in with Google again — one tap,
and because identity is now the Google account rather than a random device ID,
**their trips come back intact.** This was the main thing the old device-ID model
got wrong.
