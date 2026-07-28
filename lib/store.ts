import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import { supabase, Event, EventUser, Drink, DrinkInsert, Profile } from './supabase'

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
  clearEvent: () => void

  // ── Drinks ────────────────────────────────────────────────────────────────
  drinks: Drink[]
  setDrinks: (drinks: Drink[]) => void
  addDrink: (drink: Drink) => void

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
