import { supabase } from './supabase'
import type { Event } from './supabase'

/**
 * Closes or reopens an event. Owner-only — `events_update` enforces that, so a
 * non-owner's call comes back as zero rows updated rather than an error.
 */
export async function setEventActive(eventId: string, active: boolean): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ active, closed_at: active ? null : new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single<Event>()

  if (error) throw error
  if (!data) throw new Error("That's not your event to close.")
  return data
}
