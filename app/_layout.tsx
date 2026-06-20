import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
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

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setOffline = useStore(s => s.setOffline)
  const flushOfflineQueue = useStore(s => s.flushOfflineQueue)

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
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  )
}
