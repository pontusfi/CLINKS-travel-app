import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import { supabase, Trip, TripUser, Drink, DrinkInsert } from './supabase'

interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  session: Session | null
  /** False until the first onAuthStateChange fires, so we don't flash sign-in. */
  authReady: boolean
  setSession: (session: Session | null) => void
  setAuthReady: (ready: boolean) => void
  reset: () => void

  // ── Trip ──────────────────────────────────────────────────────────────────
  trip: Trip | null
  currentUser: TripUser | null
  tripUsers: TripUser[]
  setTrip: (trip: Trip, user: TripUser) => void
  setTripUsers: (users: TripUser[]) => void
  clearTrip: () => void

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
      // device would briefly see the previous user's trip and feed.
      reset: () =>
        set({
          session: null,
          trip: null,
          currentUser: null,
          tripUsers: [],
          drinks: [],
          offlineQueue: [],
        }),

      // ── Trip ────────────────────────────────────────────────────────────
      trip: null,
      currentUser: null,
      tripUsers: [],

      setTrip: (trip, user) => set({ trip, currentUser: user }),
      setTripUsers: (users) => set({ tripUsers: users }),
      clearTrip: () => set({ trip: null, currentUser: null, tripUsers: [], drinks: [], offlineQueue: [] }),

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
      partialize: (state) => ({
        trip: state.trip,
        currentUser: state.currentUser,
        offlineQueue: state.offlineQueue,
      }),
    }
  )
)
