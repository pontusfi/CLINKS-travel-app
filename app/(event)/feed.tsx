import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase, Drink, EventUser } from '../../lib/supabase'
import { useStore } from '../../lib/store'
import { FeedItem } from '../../components/FeedItem'
import { LogDrinkSheet } from '../../components/LogDrinkSheet'

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const extraBottom = Math.max(0, insets.bottom - 20)

  const event = useStore(s => s.event)
  const currentUser = useStore(s => s.currentUser)
  const drinks = useStore(s => s.drinks)
  const setDrinks = useStore(s => s.setDrinks)
  const addDrink = useStore(s => s.addDrink)
  const eventUsers = useStore(s => s.eventUsers)
  const setEventUsers = useStore(s => s.setEventUsers)
  const isOffline = useStore(s => s.isOffline)

  const sheetRef = useRef<BottomSheetModal>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  // FAB glow animation
  const fabGlow = useSharedValue(0.45)
  useEffect(() => {
    fabGlow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200 }),
        withTiming(0.45, { duration: 1200 }),
      ),
      -1,
      false,
    )
  }, [])
  const fabStyle = useAnimatedStyle(() => ({
    shadowOpacity: fabGlow.value,
    elevation: fabGlow.value * 20,
  }))

  // Load initial data
  useEffect(() => {
    if (!event) return
    loadDrinks()
    loadUsers()
  }, [event?.id])

  // Real-time subscription
  useEffect(() => {
    if (!event) return
    const channel = supabase
      .channel(`event-drinks-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drinks',
          filter: `event_id=eq.${event.id}`,
        },
        payload => {
          addDrink(payload.new as Drink)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id])

  async function loadDrinks() {
    if (!event) return
    const { data } = await supabase
      .from('drinks')
      .select()
      .eq('event_id', event.id)
      .order('logged_at', { ascending: false })
      .limit(50)
    if (data) setDrinks(data as Drink[])
  }

  async function loadUsers() {
    if (!event) return
    const { data } = await supabase
      .from('event_users')
      .select()
      .eq('event_id', event.id)
    if (data) setEventUsers(data as EventUser[])
  }

  async function copyCode() {
    if (!event) return
    await Clipboard.setStringAsync(event.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const totalDrinks = drinks.length
  const lastHourDrinks = drinks.filter(d => {
    const diff = Date.now() - new Date(d.logged_at).getTime()
    return diff < 3600 * 1000
  }).length

  if (!event) return null

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobRight]} />

      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚡ Offline — logging locally</Text>
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {eventUsers.length} here
              </Text>
            </View>
          </View>
          <Pressable onPress={copyCode} style={styles.codeChip}>
            <Text style={styles.codeChipText}>
              {codeCopied ? '✓ COPIED' : event.invite_code}
            </Text>
          </Pressable>
        </View>

        {/* Total drinks card */}
        <LinearGradient
          colors={['rgba(155,92,255,0.2)', 'rgba(255,61,139,0.14)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalCard}
        >
          <View>
            <Text style={styles.totalCount}>{totalDrinks}</Text>
            <Text style={styles.totalLabel}>drinks tonight</Text>
          </View>
          <View style={styles.totalRight}>
            {lastHourDrinks > 0 && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>🔥 {lastHourDrinks} in last hr</Text>
              </View>
            )}
            <View style={styles.avatarStack}>
              {eventUsers.slice(0, 3).map((u, i) => (
                <View
                  key={u.id}
                  style={[styles.stackAvatar, { marginLeft: i > 0 ? -10 : 0 }]}
                >
                  <Text style={styles.stackAvatarEmoji}>{u.avatar_emoji}</Text>
                </View>
              ))}
              {eventUsers.length > 3 && (
                <View style={[styles.stackAvatar, styles.stackMore, { marginLeft: -10 }]}>
                  <Text style={styles.stackMoreText}>+{eventUsers.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Feed header */}
        <View style={styles.feedHeader}>
          <Text style={styles.feedLabel}>LIVE FEED</Text>
          <View style={styles.updatingBadge}>
            <View style={styles.updatingDot} />
            <Text style={styles.updatingText}>updating</Text>
          </View>
        </View>

        {/* Feed list */}
        <FlatList
          data={drinks}
          keyExtractor={d => d.id}
          renderItem={({ item, index }) => (
            <FeedItem drink={item} users={eventUsers} index={index} />
          )}
          contentContainerStyle={[styles.feedList, { paddingBottom: 160 + extraBottom }]}
          ItemSeparatorComponent={() => <View style={{ height: 9 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍺</Text>
              <Text style={styles.emptyText}>No drinks yet. Be the first!</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* FAB */}
      <Animated.View style={[styles.fabWrapper, fabStyle, { bottom: 96 + extraBottom }]}>
        <TouchableOpacity
          onPress={() => sheetRef.current?.present()}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#9B5CFF', '#FF3D8B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Text style={styles.fabText}>＋ Log a drink</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <LogDrinkSheet ref={sheetRef} />
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
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blobRight: {
    top: 30,
    right: -90,
    backgroundColor: 'rgba(155,92,255,0.22)',
  },
  offlineBanner: {
    backgroundColor: 'rgba(255,61,139,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,61,139,0.3)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#FF7FB0',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 13,
  },
  eventName: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 24,
    color: '#F5F3FA',
    letterSpacing: -0.5,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6BE58A',
  },
  liveText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#8B86A0',
  },
  codeChip: {
    backgroundColor: 'rgba(155,92,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(155,92,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  codeChipText: {
    fontFamily: 'SpaceMono_Bold',
    fontSize: 13,
    color: '#C6B0FF',
  },
  totalCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  totalCount: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 50,
    color: '#F5F3FA',
    lineHeight: 56,
  },
  totalLabel: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 13,
    color: '#B6B0C8',
    marginTop: 2,
  },
  totalRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  hotBadge: {
    backgroundColor: 'rgba(198,255,77,0.12)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  hotBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#C6FF4D',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#1a1622',
    backgroundColor: 'rgba(155,92,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarEmoji: {
    fontSize: 15,
  },
  stackMore: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stackMoreText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#B6B0C8',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  feedLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 1,
  },
  updatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updatingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6BE58A',
  },
  updatingText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6BE58A',
  },
  feedList: {
    paddingBottom: 160,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 15,
    color: '#6B6680',
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    shadowColor: '#9B5CFF',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
  },
  fab: {
    height: 56,
    paddingHorizontal: 26,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 16,
    color: '#fff',
  },
})
