import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Tabs, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../../lib/store'

function HomeIcon() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: '#6B6680' }} />
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: '#6B6680' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: '#6B6680' }} />
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: '#6B6680' }} />
      </View>
    </View>
  )
}

function FeedIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#F5F3FA' : '#6B6680'
  return (
    <View style={{ gap: 3, width: 20 }}>
      <View style={[styles.feedLine, { backgroundColor: color }]} />
      <View style={[styles.feedLine, { backgroundColor: color }]} />
      <View style={[styles.feedLine, { backgroundColor: color, width: '60%' }]} />
    </View>
  )
}

function StatsIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#9B5CFF' : '#6B6680'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
      <View style={[styles.bar, { height: 8, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 14, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 11, backgroundColor: color }]} />
    </View>
  )
}

export default function TripLayout() {
  const trip = useStore(s => s.trip)
  const insets = useSafeAreaInsets()
  // Extra space to add beyond the 20px already designed into the tab bar
  const extraBottom = Math.max(0, insets.bottom - 20)

  useEffect(() => {
    if (!trip) {
      router.replace('/')
    }
  }, [trip])

  if (!trip) return null

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, {
          height: 80 + extraBottom,
          paddingBottom: 20 + extraBottom,
        }],
        tabBarBackground: () => (
          <View style={styles.tabBarBg} />
        ),
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <FeedIcon focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
              Feed
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <StatsIcon focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelActiveStats : styles.tabLabelInactive]}>
              Stats
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trips',
          tabBarButton: ({ style }) => (
            <TouchableOpacity
              style={style}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
            >
              <HomeIcon />
              <Text style={[styles.tabLabel, styles.tabLabelInactive]}>Trips</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    elevation: 0,
    position: 'absolute',
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: 'rgba(11,10,18,0.97)',
  },
  feedLine: {
    height: 3,
    borderRadius: 2,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: 'SpaceGrotesk_Bold',
    color: '#F5F3FA',
  },
  tabLabelActiveStats: {
    fontFamily: 'SpaceGrotesk_Bold',
    color: '#F5F3FA',
  },
  tabLabelInactive: {
    fontFamily: 'SpaceGrotesk_Medium',
    color: '#6B6680',
  },
})
