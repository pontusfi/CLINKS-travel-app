import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router, usePathname } from 'expo-router'
import { BackButton } from './BackButton'
import { useStore } from '../lib/store'
import { setEventActive } from '../lib/events'

/**
 * Header row for the screens inside an event: back to the events list, a
 * Feed/Stats switch, and — for the owner — closing or reopening it.
 *
 * Feed and Stats used to be a second bottom tab bar. They can't be any more —
 * the bottom of the screen now belongs to the app-wide nav — so they became a
 * segmented control up here instead.
 */
export function EventNav() {
  const pathname = usePathname()
  const onStats = pathname.endsWith('/stats')

  const event = useStore(s => s.event)
  const session = useStore(s => s.session)
  const updateEvent = useStore(s => s.updateEvent)

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isOwner = !!event && !!session && event.owner_id === session.user.id

  async function toggleActive() {
    if (!event) return
    setBusy(true)
    setError('')
    try {
      const updated = await setEventActive(event.id, !event.active)
      updateEvent(updated)
      setConfirming(false)
    } catch (e: any) {
      setError(e.message ?? 'Could not update the event.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <BackButton fallback="/" />

        <View style={styles.segment}>
          <Segment label="Feed" active={!onStats} onPress={() => router.replace('/feed')} />
          <Segment label="Stats" active={onStats} onPress={() => router.replace('/stats')} />
        </View>

        <View style={{ flex: 1 }} />

        {/* Inline confirm rather than Alert.alert — react-native-web doesn't
            implement Alert at all, and web is the primary target. */}
        {isOwner && !confirming && (
          <TouchableOpacity
            onPress={() => setConfirming(true)}
            style={styles.actionBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.actionText}>
              {event?.active ? 'End' : 'Reopen'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isOwner && confirming && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>
            {event?.active
              ? 'Close this event? No more drinks can be logged.'
              : 'Reopen this event?'}
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              onPress={() => { setConfirming(false); setError('') }}
              style={styles.confirmCancel}
              activeOpacity={0.75}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleActive}
              disabled={busy}
              style={styles.confirmGo}
              activeOpacity={0.75}
            >
              {busy
                ? <ActivityIndicator color="#0B0A12" size="small" />
                : <Text style={styles.confirmGoText}>{event?.active ? 'End it' : 'Reopen'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
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
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
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
    paddingHorizontal: 15,
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
  actionBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#B6B0C8',
  },
  confirmBar: {
    backgroundColor: 'rgba(255,61,139,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,139,0.28)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  confirmText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#F5F3FA',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmCancel: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  confirmCancelText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#B6B0C8',
  },
  confirmGo: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FF3D8B',
    minWidth: 78,
    alignItems: 'center',
  },
  confirmGoText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 13,
    color: '#fff',
  },
  errorText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 12,
    color: '#FF5C6E',
  },
})
