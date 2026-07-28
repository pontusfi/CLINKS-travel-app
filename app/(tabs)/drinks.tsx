import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../../lib/store'
import { listPresets, createPreset, deletePreset } from '../../lib/presets'
import { DrinkCategoryPicker } from '../../components/DrinkCategoryPicker'
import { CATEGORY_MAP, DrinkCategory } from '../../constants/drinks'
import type { DrinkPreset } from '../../lib/supabase'

export default function DrinksScreen() {
  const insets = useSafeAreaInsets()
  const extraBottom = Math.max(0, insets.bottom - 20)

  const session = useStore(s => s.session)
  const event = useStore(s => s.event)
  const logDrink = useStore(s => s.logDrink)

  const [presets, setPresets] = useState<DrinkPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<DrinkCategory>('beer')
  const [saving, setSaving] = useState(false)

  /** id of the preset that was just logged, for the transient "Logged ✓". */
  const [justLogged, setJustLogged] = useState<string | null>(null)

  useFocusEffect(useCallback(() => {
    let active = true
    async function load() {
      const userId = session?.user?.id
      if (!userId) { setLoading(false); return }
      setLoading(true)
      try {
        const rows = await listPresets(userId)
        if (active) { setPresets(rows); setError('') }
      } catch (e: any) {
        if (active) setError(e.message ?? 'Could not load your presets.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session?.user?.id]))

  async function handleAdd() {
    const userId = session?.user?.id
    if (!userId || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      const created = await createPreset(userId, name, category)
      setPresets(prev => [...prev, created])
      setName('')
      setCategory('beer')
      setAdding(false)
    } catch (e: any) {
      setError(e.message ?? 'Could not save that preset.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(preset: DrinkPreset) {
    const previous = presets
    setPresets(prev => prev.filter(p => p.id !== preset.id))
    try {
      await deletePreset(preset.id)
    } catch (e: any) {
      setPresets(previous)
      setError(e.message ?? 'Could not delete that preset.')
    }
  }

  async function handleLog(preset: DrinkPreset) {
    const ok = await logDrink({ category: preset.category, name: preset.name })
    if (!ok) return
    setJustLogged(preset.id)
    setTimeout(() => setJustLogged(current => (current === preset.id ? null : current)), 1800)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTop]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: 120 + extraBottom }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Drinks</Text>
              <Text style={styles.subtitle}>YOUR USUALS · ONE TAP TO LOG</Text>
            </View>

            {/* Where a tap will land */}
            {event ? (
              <View style={styles.contextPill}>
                <View style={styles.liveDot} />
                <Text style={styles.contextText} numberOfLines={1}>
                  Logging into <Text style={styles.contextName}>{event.name}</Text>
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.contextPillMuted}
                onPress={() => router.replace('/')}
                activeOpacity={0.8}
              >
                <Text style={styles.contextTextMuted}>
                  No active event — open one to log. Tap to pick.
                </Text>
              </TouchableOpacity>
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {loading ? (
              <ActivityIndicator color="#9B5CFF" style={{ marginTop: 30 }} />
            ) : (
              <>
                {presets.length === 0 && !adding && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🥃</Text>
                    <Text style={styles.emptyText}>
                      No presets yet. Save the drink you always order and it's one
                      tap from here on.
                    </Text>
                  </View>
                )}

                <View style={styles.presetList}>
                  {presets.map(preset => {
                    const cat = CATEGORY_MAP[preset.category] ?? CATEGORY_MAP.other
                    const logged = justLogged === preset.id
                    return (
                      <View key={preset.id} style={styles.presetCard}>
                        <TouchableOpacity
                          style={styles.presetMain}
                          onPress={() => handleLog(preset)}
                          disabled={!event}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.presetEmojiWrap,
                              { backgroundColor: hexAlpha(cat.color, 0.16) },
                            ]}
                          >
                            <Text style={styles.presetEmoji}>{cat.emoji}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.presetName} numberOfLines={1}>
                              {preset.name}
                            </Text>
                            <Text style={[styles.presetCat, { color: cat.color }]}>
                              {cat.label.toUpperCase()}
                            </Text>
                          </View>
                          {logged ? (
                            <Text style={styles.loggedBadge}>Logged ✓</Text>
                          ) : (
                            event && <Text style={styles.tapHint}>＋</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDelete(preset)}
                          style={styles.deleteBtn}
                          activeOpacity={0.7}
                          accessibilityLabel={`Delete ${preset.name}`}
                        >
                          <Text style={styles.deleteText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>

                {/* Add form */}
                {adding ? (
                  <View style={styles.addCard}>
                    <Text style={styles.label}>NAME</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Guinness"
                      placeholderTextColor="#5C5870"
                      style={styles.input}
                      autoCorrect={false}
                      maxLength={40}
                    />

                    <Text style={styles.label}>CATEGORY</Text>
                    <DrinkCategoryPicker selected={category} onSelect={setCategory} />

                    <View style={styles.addActions}>
                      <TouchableOpacity
                        onPress={() => { setAdding(false); setName(''); setError('') }}
                        style={styles.ghostButton}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.ghostButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleAdd}
                        disabled={!name.trim() || saving}
                        activeOpacity={0.85}
                        style={{ flex: 1 }}
                      >
                        <LinearGradient
                          colors={name.trim() ? ['#9B5CFF', '#FF3D8B'] : ['#3a3048', '#3a3048']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.primaryButton}
                        >
                          {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryButtonText}>Save preset</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setAdding(true)}
                    style={styles.addButton}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addButtonText}>＋ New preset</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0A12' },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  blobTop: { top: 20, right: -90, backgroundColor: 'rgba(155,92,255,0.22)' },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  scroll: { gap: 14, paddingTop: 4 },
  header: { gap: 3 },
  title: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 28,
    color: '#F5F3FA',
  },
  subtitle: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.6,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(107,229,138,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(107,229,138,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6BE58A' },
  contextText: { fontFamily: 'SpaceGrotesk', fontSize: 13, color: '#B6B0C8', flex: 1 },
  contextName: { fontFamily: 'SpaceGrotesk_Bold', color: '#F5F3FA' },
  contextPillMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  contextTextMuted: { fontFamily: 'SpaceGrotesk', fontSize: 13, color: '#6B6680' },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 38 },
  emptyText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 14,
    lineHeight: 21,
    color: '#6B6680',
    textAlign: 'center',
  },
  presetList: { gap: 9 },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15131D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingRight: 6,
  },
  presetMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  presetEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEmoji: { fontSize: 21 },
  presetName: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 16, color: '#F5F3FA' },
  presetCat: { fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 0.7 },
  tapHint: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 20, color: '#9B5CFF' },
  loggedBadge: { fontFamily: 'SpaceMono', fontSize: 11, color: '#6BE58A' },
  deleteBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#6B6680', fontSize: 15 },
  addCard: {
    backgroundColor: '#15131D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 9,
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.8,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#F5F3FA',
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 15,
    paddingHorizontal: 14,
  },
  addActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: {
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 16, color: '#fff' },
  ghostButton: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ghostButtonText: { fontFamily: 'SpaceGrotesk_Medium', fontSize: 16, color: '#B6B0C8' },
  addButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(155,92,255,0.4)',
  },
  addButtonText: { fontFamily: 'SpaceGrotesk_Bold', fontSize: 16, color: '#C6B0FF' },
  errorText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 13,
    color: '#FF5C6E',
    textAlign: 'center',
  },
})
