import '../global.css'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono'
import NetInfo from '@react-native-community/netinfo'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { cleanAuthUrl } from '../lib/auth'
import { loadProfile } from '../lib/profile'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setOffline = useStore(s => s.setOffline)
  const flushOfflineQueue = useStore(s => s.flushOfflineQueue)
  const setSession = useStore(s => s.setSession)
  const setAuthReady = useStore(s => s.setAuthReady)
  const session = useStore(s => s.session)
  const setProfile = useStore(s => s.setProfile)
  const setProfileError = useStore(s => s.setProfileError)

  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    SpaceGrotesk_Medium: SpaceGrotesk_500Medium,
    SpaceGrotesk_Bold: SpaceGrotesk_700Bold,
    SpaceMono: SpaceMono_400Regular,
    SpaceMono_Bold: SpaceMono_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // ── Auth session ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
      cleanAuthUrl()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthReady(true)
      cleanAuthUrl()
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // ── Profile ───────────────────────────────────────────────────────────────
  // Keyed on the user id, not the session object, so a token refresh doesn't
  // refetch. Failures are swallowed: the profile only supplies defaults, and a
  // blank one shouldn't stop you getting into an event.
  useEffect(() => {
    if (!session) return
    let active = true
    loadProfile(session)
      .then(profile => { if (active) setProfile(profile) })
      .catch(err => {
        console.warn('Could not load profile:', err.message)
        if (active) setProfileError(err.message ?? 'Could not load your profile.')
      })
    return () => { active = false }
  }, [session?.user?.id])

  // ── Network ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected
      setOffline(offline)
      if (!offline) {
        flushOfflineQueue()
      }
    })
    return unsubscribe
  }, [])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <StatusBar style="light" />
        <AuthGate />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Keeps the user on /sign-in until there's a session, and bounces them out of
 * /sign-in once there is one.
 */
function AuthGate() {
  const session = useStore(s => s.session)
  const authReady = useStore(s => s.authReady)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (!authReady) return

    const onSignIn = segments[0] === 'sign-in'

    if (!session && !onSignIn) {
      router.replace('/sign-in')
    } else if (session && onSignIn) {
      router.replace('/')
    }
  }, [session, authReady, segments])

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0A12' }}>
        <ActivityIndicator color="#9B5CFF" size="large" />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
}
