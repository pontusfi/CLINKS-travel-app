import { Stack } from 'expo-router'

/**
 * The Events tab is a stack, not a single screen, so the feed, stats and the
 * create/join flow push *inside* the tab. That's what keeps the bottom bar on
 * screen throughout — a push at the root would cover it.
 *
 * Being a stack is also what makes `router.back()` meaningful on those screens.
 */
export default function EventsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="feed" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="onboarding" />
    </Stack>
  )
}
