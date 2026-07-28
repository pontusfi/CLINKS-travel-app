import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
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
import { supabase } from '../lib/supabase'
import type { Event, EventUser } from '../lib/supabase'

const { width } = Dimensions.get('window')

type EventEntry = { event: Event; user: EventUser }

export default function HomeScreen() {
  const event = useStore(s => s.event)
  const setEvent = useStore(s => s.setEvent)
  const session = useStore(s => s.session)
  const profile = useStore(s => s.profile)

  const [events, setEvents] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)

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

  useFocusEffect(useCallback(() => {
    let active = true
    async function load() {
      const userId = session?.user?.id
      if (!userId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('event_users')
        .select('*, events(*)')
        .eq('user_id', userId)
      if (!active) return
      const entries: EventEntry[] = (data ?? [])
        .filter((row: any) => row.events?.active)
        .map((row: any) => ({ event: row.events as Event, user: row as EventUser }))
      setEvents(entries)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session?.user?.id]))

  const profileChip = (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      style={styles.profileChip}
      activeOpacity={0.7}
    >
      <Text style={styles.profileChipEmoji}>{profile?.avatar_emoji ?? '🙂'}</Text>
      <Text style={styles.profileChipText} numberOfLines={1}>
        {profile?.display_name || 'Profile'}
      </Text>
    </TouchableOpacity>
  )

  function enterEvent(entry: EventEntry) {
    setEvent(entry.event, entry.user)
    router.replace('/(event)/feed')
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#9B5CFF" size="large" />
      </View>
    )
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        {/* Background glow blobs */}
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.heroHeader}>{profileChip}</View>

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
              <Text style={styles.taglineHighlight}>Start an event or join one.</Text>
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
                <Text style={styles.primaryButtonText}>Create an event</Text>
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

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.dashHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.dashTitle}>Your events</Text>
            <Text style={styles.dashSubtitle}>
              {events.length} EVENT{events.length !== 1 ? 'S' : ''}
            </Text>
          </View>
          {profileChip}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
        >
          {events.map(entry => (
            <TouchableOpacity
              key={entry.event.id}
              onPress={() => enterEvent(entry)}
              style={[
                styles.eventCard,
                event?.id === entry.event.id && styles.eventCardActive,
              ]}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.eventCardName}>{entry.event.name}</Text>
                <Text style={styles.eventCardCode}>{entry.event.invite_code}</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 28 }}>{entry.user.avatar_emoji}</Text>
                {event?.id === entry.event.id && (
                  <Text style={styles.eventCardActiveLabel}>ACTIVE</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
              <Text style={styles.primaryButtonText}>Create an event</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding?mode=join')}
            style={styles.ghostButton}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostButtonText}>Join with a code</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Hero (empty state)
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
  // Dashboard
  dashHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHeader: {
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 170,
  },
  profileChipEmoji: {
    fontSize: 17,
  },
  profileChipText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#B6B0C8',
    flexShrink: 1,
  },
  dashTitle: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 28,
    color: '#F5F3FA',
  },
  dashSubtitle: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.6,
  },
  eventsList: {
    gap: 10,
    paddingBottom: 16,
  },
  eventCard: {
    backgroundColor: '#15131D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCardActive: {
    borderColor: 'rgba(155,92,255,0.45)',
    backgroundColor: 'rgba(155,92,255,0.08)',
  },
  eventCardName: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 17,
    color: '#F5F3FA',
  },
  eventCardCode: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#6B6680',
  },
  eventCardActiveLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#9B5CFF',
    letterSpacing: 0.5,
  },
  // Shared buttons
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
