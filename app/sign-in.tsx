import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signInWithGoogle } from '../lib/auth'

export default function SignInScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const floatY = useSharedValue(0)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  async function handleSignIn() {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      // On web this navigates away to Google; nothing after this runs.
    } catch (e: any) {
      setError(e.message ?? 'Could not sign in. Try again.')
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Animated.Text style={[styles.heroEmoji, floatStyle]}>🍻</Animated.Text>

          <MaskedView maskElement={<Text style={styles.logoText}>CLINK</Text>}>
            <LinearGradient
              colors={['#C6B0FF', '#9B5CFF', '#FF3D8B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.logoText, { opacity: 0 }]}>CLINK</Text>
            </LinearGradient>
          </MaskedView>

          <Text style={styles.tagline}>
            Log every round with your crew, in real time.{' '}
            <Text style={styles.taglineHighlight}>Sign in once, on any device.</Text>
          </Text>
        </View>

        <View style={styles.bottom}>
          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={styles.googleButton}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <>
                <GoogleMark />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerCaption}>
            YOU PICK YOUR NICKNAME NEXT 🦊
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

/** Google "G" built from four coloured quadrants — avoids bundling an asset. */
function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <Text style={styles.googleMarkText}>G</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0A12',
  },
  blob: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
  },
  blobTop: {
    top: 40,
    left: -70,
    backgroundColor: 'rgba(155,92,255,0.3)',
  },
  blobBottom: {
    bottom: 150,
    right: -90,
    backgroundColor: 'rgba(255,61,139,0.25)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  heroEmoji: {
    fontSize: 54,
  },
  logoText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 74,
    letterSpacing: -3.3,
    lineHeight: 80,
  },
  tagline: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 17,
    lineHeight: 26,
    color: '#B6B0C8',
    textAlign: 'center',
    maxWidth: 250,
  },
  taglineHighlight: {
    color: '#F5F3FA',
  },
  bottom: {
    gap: 12,
  },
  googleButton: {
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  googleButtonText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#1F1F1F',
  },
  googleMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
  },
  googleMarkText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 17,
    color: '#4285F4',
    lineHeight: 22,
  },
  error: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 14,
    color: '#FF5C6E',
    textAlign: 'center',
  },
  footerCaption: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.4,
  },
})
