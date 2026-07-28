import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DrinkCategory } from '../constants/drinks'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isWeb = Platform.OS === 'web'

// During the static web build this module is imported in Node, where there is
// no `window` for AsyncStorage to reach for. Hand supabase-js no storage there
// and it falls back to an in-memory store for the render pass.
const isServer = isWeb && typeof window === 'undefined'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    // On web the Google redirect comes back with tokens in the URL — supabase-js
    // has to read them to complete sign-in. On native the deep link is handled
    // manually, so leave it off there.
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
  },
})

// ─── Database row types ────────────────────────────────────────────────────────

export interface Event {
  id: string
  name: string
  invite_code: string
  created_by: string
  owner_id: string
  created_at: string
  active: boolean
}

export interface EventUser {
  id: string
  event_id: string
  display_name: string
  avatar_emoji: string
  user_id: string
  device_id: string | null
  joined_at: string
}

/** One row per Google account — see supabase/migrations/002_profiles.sql. */
export interface Profile {
  id: string
  display_name: string
  avatar_emoji: string
  birth_year: number | null
  weight_kg: number | null
  height_cm: number | null
  sex: 'male' | 'female' | 'other' | null
  created_at: string
  updated_at: string
}

export type ProfilePatch = Partial<
  Pick<Profile, 'display_name' | 'avatar_emoji' | 'birth_year' | 'weight_kg' | 'height_cm' | 'sex'>
>

export interface Drink {
  id: string
  event_id: string
  user_id: string
  category: DrinkCategory
  name: string | null
  note: string | null
  logged_at: string
}

export type DrinkInsert = Omit<Drink, 'id' | 'logged_at'>
