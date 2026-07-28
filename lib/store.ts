import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import { supabase, Event, EventUser, Drink, DrinkInsert, Profile } from './supabase'
import type { DrinkCategory } from '../constants/drinks'

interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  session: Session | null
  /** False until the first onAuthStateChange fires, so we don't flash sign-in. */
  authReady: boolean
  setSession: (session: Session | null) => void
  setAuthReady: (ready: boolean) => void
  reset: () => void

  // ── Profile ───────────────────────────────────────────────────────────────
  /** Account-level defaults (nickname, avatar, body stats). Null until loaded. */
  profile: Profile | null
  /** Why the profile couldn't be loaded — usually "migration 002 hasn't run". */
  profileError: string | null
  setProfile: (profile: Profile | null) => void
  setProfileError: (message: string | null) => void

  // ── Event ─────────────────────────────────────────────────────────────────
  event: Event | null
  currentUser: EventUser | null
  eventUsers: EventUser[]
  setEvent: (event: Event, user: EventUser) => void
  setEventUsers: (users: EventUser[]) => void
  /** Patches the active event in place — used when it's closed or reopened. */
  updateEvent: (patch: Partial<Event>) => void
  clearEvent: () => void

  // ── Drinks ────────────────────────────────────────────────────────────────
  drinks: Drink[]
  setDrinks: (drinks: Drink[]) => void
  addDrink: (drink: Drink) => void
  /**
   * Logs a drink into the active event: optimistic insert, then the network,
   * falling back to the offline queue. Returns false if there's no active
   * event to log into. Lives here so the log sheet and the Drinks tab share
   * one implementation.
   */
  logDrink: (input: {
    category: DrinkCategory
    name?: string | null
    note?: string | null
  }) => Promise<boolean>

  // ── Offline queue ─────────────────────────────────────────────────────────
  offlineQueue: DrinkInsert[]
  enqueueOffline: (drink: DrinkInsert) => void
  flushOfflineQueue: () => Promise<void>

  // ── Network ───────────────────────────────────────────────────────────────
  isOffline: boolean
  setOffline: (offline: boolean) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────────
      session: null,
      authReady: false,

      setSession: (session) => set({ session }),
      setAuthReady: (authReady) => set({ authReady }),

      // Full wipe on sign-out — otherwise the next person to sign in on this
      // device would briefly see the previous user's event and feed.
      reset: () =>
        set({
          session: null,
          profile: null,
          profileError: null,
          event: null,
          currentUser: null,
          eventUsers: [],
          drinks: [],
          offlineQueue: [],
        }),

      // ── Profile ─────────────────────────────────────────────────────────
      profile: null,
      profileError: null,
      setProfile: (profile) => set({ profile, profileError: null }),
      setProfileError: (profileError) => set({ profileError }),

      // ── Event ───────────────────────────────────────────────────────────
      event: null,
      currentUser: null,
      eventUsers: [],

      setEvent: (event, user) => set({ event, currentUser: user }),
      setEventUsers: (users) => set({ eventUsers: users }),
      updateEvent: (patch) =>
        set(state => (state.event ? { event: { ...state.event, ...patch } } : state)),
      clearEvent: () => set({ event: null, currentUser: null, eventUsers: [], drinks: [], offlineQueue: [] }),

      // ── Drinks ──────────────────────────────────────────────────────────
      drinks: [],

      setDrinks: (drinks) => set({ drinks }),

      addDrink: (drink) =>
        set(state => {
          const exists = state.drinks.some(d => d.id === drink.id)
          if (exists) return state
          return { drinks: [drink, ...state.drinks] }
        }),

      logDrink: async ({ category, name = null, note = null }) => {
        const { event, currentUser, isOffline } = get()
        if (!event || !currentUser) return false
        // A closed event refuses drinks server-side too (drinks_insert checks
        // is_event_active), so without this the optimistic row would appear and
        // then quietly fall into the offline queue to be rejected forever.
        if (!event.active) return false

        const insert: DrinkInsert = {
          event_id: event.id,
          user_id: currentUser.id,
          category,
          name: name || null,
          note: note || null,
        }

        const localId = `local-${Date.now()}`
        get().addDrink({ ...insert, id: localId, logged_at: new Date().toISOString() })

        if (isOffline) {
          get().enqueueOffline(insert)
          return true
        }

        // Swap the placeholder for the real row rather than just firing the
        // insert. The realtime subscription will also deliver this row, and
        // addDrink dedupes on id — so without the swap the feed shows the same
        // drink twice, once as `local-…` and once as its real uuid.
        const { data, error } = await supabase
          .from('drinks')
          .insert(insert)
          .select()
          .single<Drink>()

        if (error || !data) {
          get().enqueueOffline(insert)
          return true
        }

        set(state => ({
          drinks: state.drinks.some(d => d.id === data.id)
            ? state.drinks.filter(d => d.id !== localId)
            : state.drinks.map(d => (d.id === localId ? data : d)),
        }))
        return true
      },

      // ── Offline queue ────────────────────────────────────────────────────
      offlineQueue: [],

      enqueueOffline: (drink) =>
        set(state => ({ offlineQueue: [...state.offlineQueue, drink] })),

      flushOfflineQueue: async () => {
        const { offlineQueue } = get()
        if (!offlineQueue.length) return
        const { error } = await supabase.from('drinks').insert(offlineQueue)
        if (!error) set({ offlineQueue: [] })
      },

      // ── Network ─────────────────────────────────────────────────────────
      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),
    }),
    {
      name: 'clink-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // v0 stored the active event under `trip`. Without this, everyone already
      // signed in gets silently bounced to the dashboard on their next load.
      version: 1,
      migrate: (persisted: any, version) => {
        if (version === 0 && persisted && 'trip' in persisted) {
          const { trip, ...rest } = persisted
          return { ...rest, event: trip }
        }
        return persisted
      },
      partialize: (state) => ({
        profile: state.profile,
        event: state.event,
        currentUser: state.currentUser,
        offlineQueue: state.offlineQueue,
      }),
    }
  )
)
