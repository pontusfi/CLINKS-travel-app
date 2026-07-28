import { supabase } from './supabase'
import type { DrinkPreset } from './supabase'
import type { DrinkCategory } from '../constants/drinks'

export async function listPresets(userId: string): Promise<DrinkPreset[]> {
  const { data, error } = await supabase
    .from('drink_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as DrinkPreset[]
}

export async function createPreset(
  userId: string,
  name: string,
  category: DrinkCategory,
): Promise<DrinkPreset> {
  const { data, error } = await supabase
    .from('drink_presets')
    .insert({ user_id: userId, name: name.trim(), category })
    .select()
    .single<DrinkPreset>()

  if (error) {
    // 23505 is the (user_id, lower(name)) unique index. The raw message names
    // the index, which is no help to anyone holding a phone.
    if (error.code === '23505') throw new Error('You already have a preset with that name.')
    throw error
  }
  return data
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase.from('drink_presets').delete().eq('id', id)
  if (error) throw error
}
