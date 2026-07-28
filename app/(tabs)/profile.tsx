import { useEffect, useRef, useState } from 'react'
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
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../../lib/store'
import { signOut } from '../../lib/auth'
import { saveProfile, ageFromBirthYear } from '../../lib/profile'
import { AVATAR_OPTIONS } from '../../constants/drinks'
import type { Profile } from '../../lib/supabase'

type Sex = NonNullable<Profile['sex']>

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
]

/** '' → null, so clearing a field wipes it rather than saving 0. */
function toNumber(input: string): number | null {
  const trimmed = input.replace(',', '.').trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : NaN
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const tabBarSpace = 80 + Math.max(0, insets.bottom - 20)

  const profile = useStore(s => s.profile)
  const profileError = useStore(s => s.profileError)
  const setProfile = useStore(s => s.setProfile)
  const session = useStore(s => s.session)
  const reset = useStore(s => s.reset)

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [birthYear, setBirthYear] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Fill the form once, the first time the profile arrives. Re-running on every
  // profile change would overwrite whatever the user is halfway through typing.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!profile || hydrated.current) return
    hydrated.current = true
    setName(profile.display_name)
    setAvatar(profile.avatar_emoji || AVATAR_OPTIONS[0])
    setBirthYear(profile.birth_year?.toString() ?? '')
    setWeight(profile.weight_kg?.toString() ?? '')
    setHeight(profile.height_cm?.toString() ?? '')
    setSex(profile.sex)
  }, [profile])

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
  }, [])

  const age = ageFromBirthYear(Number(birthYear) || null)

  function validate(): string | null {
    if (!name.trim()) return 'Pick a nickname.'

    const y = toNumber(birthYear)
    const w = toNumber(weight)
    const h = toNumber(height)

    const thisYear = new Date().getFullYear()
    if (y !== null && (Number.isNaN(y) || y < 1900 || y > thisYear)) {
      return `Birth year should be between 1900 and ${thisYear}.`
    }
    if (w !== null && (Number.isNaN(w) || w < 20 || w > 400)) {
      return 'Weight should be between 20 and 400 kg.'
    }
    if (h !== null && (Number.isNaN(h) || h < 80 || h > 260)) {
      return 'Height should be between 80 and 260 cm.'
    }
    return null
  }

  async function handleSave() {
    const userId = session?.user?.id
    if (!userId) {
      setError('Your session expired. Sign in again.')
      return
    }

    const problem = validate()
    if (problem) {
      setError(problem)
      setSaved(false)
      return
    }

    setSaving(true)
    setError('')
    try {
      const updated = await saveProfile(userId, {
        display_name: name.trim(),
        avatar_emoji: avatar,
        birth_year: toNumber(birthYear),
        weight_kg: toNumber(weight),
        height_cm: toNumber(height),
        sex,
      })
      setProfile(updated)
      setSaved(true)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    reset()
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        {profileError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Profile unavailable</Text>
            <Text style={styles.emptyBody}>{profileError}</Text>
            <Text style={[styles.hint, { textAlign: 'center' }]}>
              If this says the profiles table is missing, run
              supabase/migrations/002_profiles.sql in the Supabase SQL editor.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.ghostBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator color="#9B5CFF" size="large" />
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTop]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your profile</Text>
            </View>

            {/* Avatar preview */}
            <View style={styles.avatarPreview}>
              <LinearGradient
                colors={['rgba(155,92,255,0.3)', 'rgba(255,61,139,0.3)']}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              </LinearGradient>
              <Text style={styles.avatarName}>{name || 'Your nickname'}</Text>
              {!!session?.user?.email && (
                <Text style={styles.avatarEmail}>{session.user.email}</Text>
              )}
            </View>

            {/* Nickname */}
            <View style={styles.section}>
              <Text style={styles.label}>NICKNAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Felix"
                placeholderTextColor="#5C5870"
                style={styles.input}
                autoCorrect={false}
                maxLength={20}
              />
              <Text style={styles.hint}>
                Pre-fills every new event. You can still use a different one per event.
              </Text>
            </View>

            {/* Avatar picker */}
            <View style={styles.section}>
              <Text style={styles.label}>YOUR AVATAR</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map(a => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAvatar(a)}
                    style={[styles.avatarTile, a === avatar && styles.avatarTileSelected]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.avatarTileEmoji}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Body stats */}
            <View style={styles.section}>
              <Text style={styles.label}>ABOUT YOU · OPTIONAL</Text>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>
                    Birth year{age !== null ? `  ·  ${age}y` : ''}
                  </Text>
                  <TextInput
                    value={birthYear}
                    onChangeText={t => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="1998"
                    placeholderTextColor="#5C5870"
                    style={styles.input}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    value={weight}
                    onChangeText={t => setWeight(t.replace(/[^0-9.,]/g, '').slice(0, 5))}
                    placeholder="78"
                    placeholderTextColor="#5C5870"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    value={height}
                    onChangeText={t => setHeight(t.replace(/[^0-9]/g, '').slice(0, 3))}
                    placeholder="180"
                    placeholderTextColor="#5C5870"
                    style={styles.input}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <View style={styles.rowItem} />
              </View>

              <Text style={styles.fieldLabel}>Sex</Text>
              <View style={styles.pillRow}>
                {SEX_OPTIONS.map(opt => {
                  const selected = sex === opt.id
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      // Tap again to clear — the field is optional and there's no
                      // other way back to "not saying".
                      onPress={() => setSex(selected ? null : opt.id)}
                      style={[styles.pill, selected && styles.pillSelected]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.hint}>
                Only you can see this — it's here so CLINK can estimate your pace
                later. Leave it blank if you'd rather not.
              </Text>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={{ marginTop: 4 }}
            >
              <LinearGradient
                colors={saved ? ['#3FA35C', '#6BE58A'] : ['#9B5CFF', '#FF3D8B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {saved ? 'Saved ✓' : 'Save profile'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  blobTop: {
    top: 30,
    left: -60,
    backgroundColor: 'rgba(155,92,255,0.25)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#B6B0C8',
    fontSize: 22,
    lineHeight: 26,
    marginTop: -2,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 21,
    color: '#F5F3FA',
  },
  avatarPreview: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#9B5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 44,
  },
  avatarName: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#F5F3FA',
  },
  avatarEmail: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
  },
  emptyState: {
    paddingHorizontal: 32,
    gap: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 20,
    color: '#F5F3FA',
  },
  emptyBody: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 14,
    color: '#FF5C6E',
    textAlign: 'center',
  },
  section: {
    gap: 7,
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 13,
    color: '#B6B0C8',
  },
  hint: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 12,
    lineHeight: 17,
    color: '#6B6680',
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#F5F3FA',
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
    gap: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillSelected: {
    backgroundColor: 'rgba(155,92,255,0.2)',
    borderWidth: 2,
    borderColor: '#9B5CFF',
  },
  pillText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 14,
    color: '#B6B0C8',
  },
  pillTextSelected: {
    color: '#F5F3FA',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarTile: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  avatarTileSelected: {
    backgroundColor: 'rgba(155,92,255,0.2)',
    borderWidth: 2,
    borderColor: '#9B5CFF',
  },
  avatarTileEmoji: {
    fontSize: 23,
  },
  submitButton: {
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#fff',
  },
  ghostBtn: {
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginTop: 6,
  },
  ghostBtnText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 15,
    color: '#F5F3FA',
  },
  signOutBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,92,110,0.25)',
    marginTop: 4,
  },
  signOutText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 15,
    color: '#FF5C6E',
  },
  errorText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 13,
    color: '#FF5C6E',
    textAlign: 'center',
  },
})
