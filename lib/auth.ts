import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Starts the Google OAuth flow.
 *
 * Web: full-page redirect to Google and back. supabase-js picks the session out
 * of the return URL because `detectSessionInUrl` is on for web.
 *
 * Native: not wired up yet — it needs expo-auth-session plus a separate Google
 * OAuth client per platform (Android's requires the signing SHA-1, which only
 * exists once you've made an EAS build). See docs/GOOGLE_AUTH.md.
 */
export async function signInWithGoogle() {
  if (Platform.OS !== 'web') {
    throw new Error(
      'Google sign-in is currently web-only. See docs/GOOGLE_AUTH.md to add native.',
    )
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        // Ask Google to hand back a refresh token so sessions survive properly.
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Strips the OAuth fragment/query from the URL after a successful web sign-in,
 * so tokens don't linger in the address bar or get copy-pasted into a chat.
 */
export function cleanAuthUrl() {
  if (Platform.OS !== 'web') return
  if (typeof window === 'undefined') return
  if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}
