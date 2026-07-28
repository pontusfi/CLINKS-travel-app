import { View, Text, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * The app's permanent bottom navigation: Profile · Events · Drinks.
 *
 * Every signed-in screen lives under here, including the ones you push (event
 * feed, stats, onboarding), so the bar never disappears mid-flow. Those pushed
 * screens sit in the (events) stack and carry their own back button.
 */

const ACTIVE = '#F5F3FA'
const INACTIVE = '#6B6680'

function ProfileIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#9B5CFF' : INACTIVE
  return (
    <View style={styles.icon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  )
}

function EventsIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#9B5CFF' : INACTIVE
  return (
    <View style={[styles.icon, { gap: 3 }]}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={[styles.cell, { backgroundColor: color }]} />
        <View style={[styles.cell, { backgroundColor: color }]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={[styles.cell, { backgroundColor: color }]} />
        <View style={[styles.cell, { backgroundColor: color }]} />
      </View>
    </View>
  )
}

function DrinksIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#9B5CFF' : INACTIVE
  return (
    <View style={styles.icon}>
      <View style={[styles.glassBowl, { borderColor: color }]} />
      <View style={[styles.glassStem, { backgroundColor: color }]} />
      <View style={[styles.glassFoot, { backgroundColor: color }]} />
    </View>
  )
}

function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return (
    <Text style={[styles.label, { color: focused ? ACTIVE : INACTIVE }]}>
      {children}
    </Text>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  // 20px of breathing room is already baked into the bar; only add what the
  // device's own inset needs beyond that.
  const extraBottom = Math.max(0, insets.bottom - 20)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 80 + extraBottom, paddingBottom: 20 + extraBottom },
        ],
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Profile</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="(events)"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused }) => <EventsIcon focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Events</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="drinks"
        options={{
          title: 'Drinks',
          tabBarIcon: ({ focused }) => <DrinksIcon focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Drinks</TabLabel>,
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
  icon: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 11,
    marginTop: 2,
  },
  cell: {
    width: 7,
    height: 7,
    borderRadius: 2,
  },
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.8,
  },
  profileBody: {
    width: 16,
    height: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    marginTop: 2,
  },
  glassBowl: {
    width: 14,
    height: 9,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  glassStem: {
    width: 1.8,
    height: 5,
  },
  glassFoot: {
    width: 11,
    height: 1.8,
    borderRadius: 1,
  },
})
