import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile, ProfilePatch } from './supabase'
import { AVATAR_OPTIONS } from '../constants/drinks'

/**
 * Reads the signed-in user's profile, creating it if it isn't there.
 *
 * The `on_auth_user_created` trigger normally makes the row at sign-up, but
 * accounts that existed before migration 002 ran — and anything that slips past
 * the trigger — still need a row, so this backfills client-side rather than
 * leaving the profile screen permanently empty.
 */
export async function loadProfile(session: Session): Promise<Profile | null> {
  const userId = session.user.id

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>()

  if (error) throw error
  if (data) return data

  const meta = session.user.user_metadata ?? {}
  const fallbackName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    ''

  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: fallbackName.slice(0, 20),
      avatar_emoji: AVATAR_OPTIONS[0],
    })
    .select()
    .single<Profile>()

  if (insertErr) throw insertErr
  return created
}

export async function saveProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single<Profile>()

  if (error) throw error
  return data
}

/** Age from birth year — approximate by up to a year, which is fine here. */
export function ageFromBirthYear(birthYear: number | null): number | null {
  if (!birthYear) return null
  const age = new Date().getFullYear() - birthYear
  return age >= 0 && age < 150 ? age : null
}
