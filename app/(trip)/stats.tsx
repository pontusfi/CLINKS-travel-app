import { useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useStore } from '../../lib/store'
import { DRINK_CATEGORIES, DrinkCategory } from '../../constants/drinks'
import { StatCard } from '../../components/StatCard'
import { formatHour } from '../../lib/utils'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 36 - 28 // screen - paddingH - card padding

// ── Night-arc hours shown on chart ──────────────────────────────────────────
const PARTY_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]
const CHART_LABELS = ['6p', '8p', '10p', '12a', '2a', '4a'] // every other for space

export default function StatsScreen() {
  const trip = useStore(s => s.trip)
  const drinks = useStore(s => s.drinks)
  const tripUsers = useStore(s => s.tripUsers)

  const stats = useMemo(() => {
    if (!drinks.length || !tripUsers.length) return null

    // ── Leaderboard ──────────────────────────────────────────────────────────
    const countByUser: Record<string, number> = {}
    for (const d of drinks) {
      countByUser[d.user_id] = (countByUser[d.user_id] ?? 0) + 1
    }
    const leaderboard = tripUsers
      .map(u => ({ user: u, count: countByUser[u.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
    const maxCount = leaderboard[0]?.count ?? 1

    // ── Night arc ────────────────────────────────────────────────────────────
    const byHour: Record<number, number> = {}
    for (const d of drinks) {
      const h = new Date(d.logged_at).getHours()
      byHour[h] = (byHour[h] ?? 0) + 1
    }
    const arcData = PARTY_HOURS.map(h => ({ hour: h, count: byHour[h] ?? 0 }))
    const maxArc = Math.max(...arcData.map(d => d.count), 1)
    const peakIdx = arcData.reduce((best, d, i) => d.count > arcData[best].count ? i : best, 0)
    const peakLabel = formatHour(PARTY_HOURS[peakIdx])

    // ── Category breakdown ───────────────────────────────────────────────────
    const byCategory: Record<DrinkCategory, number> = {} as any
    for (const d of drinks) {
      byCategory[d.category] = (byCategory[d.category] ?? 0) + 1
    }
    const catBreakdown = DRINK_CATEGORIES
      .map(c => ({ ...c, count: byCategory[c.id] ?? 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
    const maxCat = catBreakdown[0]?.count ?? 1
    const topCat = catBreakdown[0]

    return {
      leaderboard,
      maxCount,
      arcData,
      maxArc,
      peakLabel,
      catBreakdown,
      maxCat,
      topCat,
      total: drinks.length,
    }
  }, [drinks, tripUsers])

  async function handleShare() {
    if (!trip || !stats) return
    const lines = [
      `🍻 ${trip.name} — CLINK Stats`,
      '',
      `Total drinks: ${stats.total}`,
      '',
      '🏆 Leaderboard:',
      ...stats.leaderboard.map((e, i) =>
        `${i + 1}. ${e.user.avatar_emoji} ${e.user.display_name} — ${e.count} drinks`,
      ),
      '',
      `📊 Top drink: ${stats.topCat?.emoji ?? ''} ${stats.topCat?.label ?? ''}`,
      `🔥 Peak hour: ${stats.peakLabel}`,
    ]
    await Share.share({ message: lines.join('\n') })
  }

  if (!trip) return null

  const barWidth = Math.floor((CHART_WIDTH - PARTY_HOURS.length * 6) / PARTY_HOURS.length)

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Stats</Text>
              <Text style={styles.subtitle}>{trip.name} · live</Text>
            </View>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={styles.shareBtn}>
              <LinearGradient
                colors={['#9B5CFF', '#FF3D8B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareBtnGradient}
              >
                <Text style={styles.shareBtnText}>Share ↗</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Callout chips */}
          {stats && (
            <View style={styles.chips}>
              <View style={[styles.chip, styles.chipOrange]}>
                <Text style={[styles.chipText, { color: '#FFCD83' }]}>
                  🔥 Peak: {stats.peakLabel}
                </Text>
              </View>
              {stats.leaderboard[0] && (
                <View style={[styles.chip, styles.chipGreen]}>
                  <Text style={[styles.chipText, { color: '#C6FF4D' }]}>
                    {stats.leaderboard[0].user.avatar_emoji} {stats.leaderboard[0].user.display_name} leads
                  </Text>
                </View>
              )}
              {stats.topCat && (
                <View style={[styles.chip, styles.chipPurple]}>
                  <Text style={[styles.chipText, { color: '#C6B0FF' }]}>
                    {stats.topCat.emoji} {stats.topCat.label} winning
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stat summary cards */}
          {stats && (
            <View style={styles.statCards}>
              <StatCard
                icon={stats.leaderboard[0]?.user.avatar_emoji ?? ''}
                label="MVP"
                value={`${stats.leaderboard[0]?.user.display_name ?? '—'} (${stats.leaderboard[0]?.count ?? 0})`}
                valueColor="#C6FF4D"
              />
              <StatCard
                icon="🍻"
                label="TOTAL"
                value={String(stats.total)}
                valueColor="#C6B0FF"
              />
            </View>
          )}

          {/* Leaderboard */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>LEADERBOARD</Text>
            {stats ? (
              stats.leaderboard.map((entry, i) => {
                const pct = stats.maxCount > 0 ? entry.count / stats.maxCount : 0
                const isFirst = i === 0
                return (
                  <View key={entry.user.id} style={styles.leaderRow}>
                    <Text style={[styles.rank, isFirst && styles.rankFirst]}>{i + 1}</Text>
                    <View style={styles.leaderAvatar}>
                      <Text style={styles.leaderAvatarEmoji}>{entry.user.avatar_emoji}</Text>
                    </View>
                    <View style={styles.leaderInfo}>
                      <View style={styles.leaderNameRow}>
                        <Text style={styles.leaderName}>{entry.user.display_name}</Text>
                        <Text style={[styles.leaderCount, isFirst && { color: '#C6FF4D' }]}>
                          {entry.count}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${pct * 100}%` }]}>
                          <LinearGradient
                            colors={isFirst ? ['#9B5CFF', '#C6FF4D'] : ['#9B5CFF', '#FF3D8B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })
            ) : (
              <Text style={styles.emptyText}>No data yet — log some drinks!</Text>
            )}
          </View>

          {/* Night arc bar chart (custom) */}
          {stats && stats.arcData.some(d => d.count > 0) && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardLabel}>THE NIGHT ARC</Text>
                <Text style={styles.cardMeta}>peak {stats.peakLabel} 🔥</Text>
              </View>

              <View style={styles.arcChart}>
                {stats.arcData.map((d, i) => {
                  const isPeak = d.count === stats.maxArc && d.count > 0
                  const heightPct = stats.maxArc > 0 ? d.count / stats.maxArc : 0
                  const barH = Math.max(heightPct * 104, d.count > 0 ? 6 : 0)
                  return (
                    <View key={d.hour} style={[styles.arcBarCol, { width: barWidth }]}>
                      <View style={[styles.arcBarTrack, { height: 104 }]}>
                        <View style={{ height: 104 - barH }} />
                        {isPeak ? (
                          <LinearGradient
                            colors={['#9B5CFF', '#FF3D8B']}
                            style={[styles.arcBar, { height: barH }]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.arcBar,
                              {
                                height: barH,
                                backgroundColor: i < 6
                                  ? `rgba(155,92,255,${0.35 + heightPct * 0.3})`
                                  : `rgba(255,61,139,${0.3 + heightPct * 0.25})`,
                              },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>

              <View style={styles.arcXAxis}>
                {CHART_LABELS.map(l => (
                  <Text key={l} style={styles.arcXLabel}>{l}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Category breakdown */}
          {stats && stats.catBreakdown.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>WHAT THE GROUP'S DRINKING</Text>
              {stats.catBreakdown.map(cat => {
                const pct = cat.count / stats.maxCat
                return (
                  <View key={cat.id} style={styles.catRow}>
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <View style={styles.catInfo}>
                      <View style={styles.catNameRow}>
                        <Text style={styles.catName}>{cat.label}</Text>
                        <Text style={styles.catCount}>{cat.count}</Text>
                      </View>
                      <View style={styles.catTrack}>
                        <View style={[styles.catBar, { width: `${pct * 100}%`, backgroundColor: cat.color }]} />
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {!stats && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyStateText}>
                Stats appear once the crew starts logging drinks.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0A12' },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 24, color: '#F5F3FA' },
  subtitle: { fontFamily: 'SpaceMono', fontSize: 12, color: '#8B86A0' },
  shareBtn: { borderRadius: 12, overflow: 'hidden' },
  shareBtnGradient: { height: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 13, color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipOrange: { backgroundColor: 'rgba(255,178,61,0.12)', borderColor: 'rgba(255,178,61,0.25)' },
  chipGreen: { backgroundColor: 'rgba(198,255,77,0.1)', borderColor: 'rgba(198,255,77,0.22)' },
  chipPurple: { backgroundColor: 'rgba(155,92,255,0.12)', borderColor: 'rgba(155,92,255,0.25)' },
  chipText: { fontFamily: 'SpaceMono', fontSize: 11 },
  statCards: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: '#15131D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 14,
    gap: 11,
  },
  cardLabel: { fontFamily: 'SpaceMono', fontSize: 11, color: '#6B6680', letterSpacing: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontFamily: 'SpaceMono', fontSize: 11, color: '#FF7FB0' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontFamily: 'SpaceMono_Bold', fontSize: 14, color: '#8B86A0', width: 16 },
  rankFirst: { color: '#C6FF4D' },
  leaderAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarEmoji: { fontSize: 16 },
  leaderInfo: { flex: 1, gap: 4 },
  leaderNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaderName: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 13, color: '#F5F3FA' },
  leaderCount: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 13, color: '#B6B0C8' },
  progressTrack: {
    height: 7, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  arcChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  arcBarCol: { alignItems: 'center' },
  arcBarTrack: { width: '100%', justifyContent: 'flex-end' },
  arcBar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  arcXAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  arcXLabel: { fontFamily: 'SpaceMono', fontSize: 10, color: '#6B6680' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 18 },
  catInfo: { flex: 1, gap: 3 },
  catNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontFamily: 'SpaceGrotesk', fontSize: 12, color: '#E9E6F2' },
  catCount: { fontFamily: 'SpaceMono', fontSize: 12, color: '#8B86A0' },
  catTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  catBar: { height: '100%', borderRadius: 3 },
  emptyText: {
    fontFamily: 'SpaceGrotesk', fontSize: 13, color: '#6B6680',
    textAlign: 'center', paddingVertical: 8,
  },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyStateText: {
    fontFamily: 'SpaceGrotesk_Medium', fontSize: 14,
    color: '#6B6680', textAlign: 'center', maxWidth: 260,
  },
})
