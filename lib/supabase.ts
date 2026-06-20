import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DrinkCategory } from '../constants/drinks'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Database row types ────────────────────────────────────────────────────────

export interface Trip {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  active: boolean
}

export interface TripUser {
  id: string
  trip_id: string
  display_name: string
  avatar_emoji: string
  device_id: string
  joined_at: string
}

export interface Drink {
  id: string
  trip_id: string
  user_id: string
  category: DrinkCategory
  name: string | null
  note: string | null
  logged_at: string
}

export type DrinkInsert = Omit<Drink, 'id' | 'logged_at'>
