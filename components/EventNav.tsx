import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router, usePathname } from 'expo-router'
import { BackButton } from './BackButton'

/**
 * Header row for the screens inside an event: back to the events list, plus a
 * Feed/Stats switch.
 *
 * Feed and Stats used to be a second bottom tab bar. They can't be any more —
 * the bottom of the screen now belongs to the app-wide nav — so they became a
 * segmented control up here instead.
 */
export function EventNav() {
  const pathname = usePathname()
  const onStats = pathname.endsWith('/stats')

  return (
    <View style={styles.row}>
      <BackButton fallback="/" />

      <View style={styles.segment}>
        <Segment label="Feed" active={!onStats} onPress={() => router.replace('/feed')} />
        <Segment label="Stats" active={onStats} onPress={() => router.replace('/stats')} />
      </View>
    </View>
  )
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentItemActive]}
      activeOpacity={0.75}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: 'rgba(155,92,255,0.25)',
  },
  segmentText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#B6B0C8',
  },
  segmentTextActive: {
    fontFamily: 'SpaceGrotesk_Bold',
    color: '#F5F3FA',
  },
})
