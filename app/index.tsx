import { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
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
import { useStore } from '../lib/store'

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  const trip = useStore(s => s.trip)

  // Redirect to feed if already in a trip
  useEffect(() => {
    if (trip) {
      router.replace('/(trip)/feed')
    }
  }, [trip])

  const floatY = useSharedValue(0)
  const pulseDot = useSharedValue(1)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    pulseDot.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    )
  }, [])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulseDot.value }))

  return (
    <View style={styles.container}>
      {/* Background glow blobs */}
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Center content */}
        <View style={styles.center}>
          {/* Live pill */}
          <View style={styles.livePill}>
            <Animated.View style={[styles.liveDot, dotStyle]} />
            <Text style={styles.livePillText}>1,204 PEOPLE DRINKING NOW</Text>
          </View>

          {/* Floating emoji */}
          <Animated.Text style={[styles.heroEmoji, floatStyle]}>🍻</Animated.Text>

          {/* CLINK gradient logo */}
          <MaskedView
            maskElement={
              <Text style={styles.logoText}>CLINK</Text>
            }
          >
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
            <Text style={styles.taglineHighlight}>No login — just your name.</Text>
          </Text>
        </View>

        {/* Bottom CTA buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={() => router.push('/onboarding?mode=create')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#9B5CFF', '#FF3D8B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create a trip</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding?mode=join')}
            style={styles.ghostButton}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostButtonText}>Join with a code</Text>
          </TouchableOpacity>

          <Text style={styles.footerCaption}>
            PICK A NAME · SHARE A CODE · GO 🚀
          </Text>
        </View>
      </SafeAreaView>
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
    // RN doesn't support CSS blur, using opacity for approximation
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6BE58A',
  },
  livePillText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#B6B0C8',
    letterSpacing: 0.6,
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
    maxWidth: 235,
  },
  taglineHighlight: {
    color: '#F5F3FA',
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#fff',
  },
  ghostButton: {
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ghostButtonText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#F5F3FA',
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
