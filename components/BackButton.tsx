import { Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import type { Href } from 'expo-router'

interface Props {
  /**
   * Where to go when there's nothing to go back to. This isn't paranoia: on
   * web you can open /feed or /profile directly from a link or a refresh, and
   * `router.back()` in that situation does nothing at all, leaving a button
   * that visibly ignores you.
   */
  fallback?: Href
}

export function BackButton({ fallback = '/' }: Props) {
  function handlePress() {
    if (router.canGoBack()) router.back()
    else router.replace(fallback)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.chevron}>‹</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    color: '#B6B0C8',
    fontSize: 22,
    lineHeight: 26,
    marginTop: -2,
  },
})
