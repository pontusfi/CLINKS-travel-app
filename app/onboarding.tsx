import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { generateInviteCode } from '../lib/utils'
import { AVATAR_OPTIONS, AVATAR_BG_COLORS } from '../constants/drinks'
import type { Trip, TripUser } from '../lib/supabase'

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode: 'create' | 'join' }>()
  const isCreate = mode === 'create'

  const setTrip = useStore(s => s.setTrip)
  const session = useStore(s => s.session)

  const [name, setName] = useState('')
  const [tripName, setTripName] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [joinCode, setJoinCode] = useState('')
  const [generatedCode] = useState(() => generateInviteCode())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit =
    name.trim().length > 0 &&
    (isCreate ? tripName.trim().length > 0 : joinCode.length === 6)

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const userId = session?.user?.id
      if (!userId) {
        setError('Your session expired. Sign in again.')
        return
      }

      if (isCreate) {
        // Create trip
        const { data: trip, error: tripErr } = await supabase
          .from('trips')
          .insert({
            name: tripName.trim(),
            invite_code: generatedCode,
            created_by: userId,
            owner_id: userId,
            active: true,
          })
          .select()
          .single()

        if (tripErr) throw tripErr

        // Create trip user
        const { data: user, error: userErr } = await supabase
          .from('trip_users')
          .insert({
            trip_id: trip.id,
            display_name: name.trim(),
            avatar_emoji: avatar,
            user_id: userId,
          })
          .select()
          .single()

        if (userErr) throw userErr

        setTrip(trip, user)
        router.replace('/(trip)/feed')
      } else {
        // Join by code. RLS hides trips you're not a member of, so this goes
        // through a SECURITY DEFINER function that does the lookup server-side.
        const code = joinCode.trim().toUpperCase()

        const { data: trip, error: joinErr } = await supabase
          .rpc('join_trip_by_code', {
            p_code: code,
            p_display_name: name.trim(),
            p_avatar_emoji: avatar,
          })
          .single<Trip>()

        if (joinErr) {
          if (joinErr.message?.includes('TRIP_NOT_FOUND')) {
            setError('Trip not found. Double-check the code.')
            return
          }
          throw joinErr
        }
        if (!trip) {
          setError('Trip not found. Double-check the code.')
          return
        }

        const { data: user, error: userErr } = await supabase
          .from('trip_users')
          .select()
          .eq('trip_id', trip.id)
          .eq('user_id', userId)
          .single<TripUser>()

        if (userErr) throw userErr

        setTrip(trip, user)
        router.replace('/(trip)/feed')
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isCreate ? 'Set up your avatar' : 'Join a trip'}
              </Text>
            </View>

            {/* Join code input (join mode) */}
            {!isCreate && (
              <View style={styles.section}>
                <Text style={styles.label}>INVITE CODE</Text>
                <TextInput
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase().slice(0, 6))}
                  placeholder="Enter 6-char code"
                  placeholderTextColor="#5C5870"
                  style={[styles.input, styles.codeInput]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                />
                {!!error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}

            {/* Avatar preview */}
            <View style={styles.avatarPreview}>
              <LinearGradient
                colors={['rgba(155,92,255,0.3)', 'rgba(255,61,139,0.3)']}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              </LinearGradient>
              <Text style={styles.avatarName}>{name || 'Your name'}</Text>
            </View>

            {/* Name input */}
            <View style={styles.section}>
              <Text style={styles.label}>YOUR NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Felix"
                placeholderTextColor="#5C5870"
                style={styles.input}
                autoCorrect={false}
                maxLength={20}
              />
            </View>

            {/* Trip name input (create mode only) */}
            {isCreate && (
              <View style={styles.section}>
                <Text style={styles.label}>TRIP NAME</Text>
                <TextInput
                  value={tripName}
                  onChangeText={setTripName}
                  placeholder="e.g. Barcelona 2026"
                  placeholderTextColor="#5C5870"
                  style={styles.input}
                  autoCorrect={false}
                  maxLength={40}
                />
              </View>
            )}

            {/* Avatar picker */}
            <View style={styles.section}>
              <Text style={styles.label}>PICK YOUR AVATAR</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map(a => {
                  const selected = a === avatar
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setAvatar(a)}
                      style={[
                        styles.avatarTile,
                        selected && styles.avatarTileSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.avatarTileEmoji}>{a}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Invite code card (create mode) */}
            {isCreate && (
              <View style={styles.codeCard}>
                <LinearGradient
                  colors={['rgba(155,92,255,0.14)', 'rgba(255,61,139,0.11)']}
                  style={styles.codeCardGradient}
                >
                  <View style={styles.codeCardHeader}>
                    <Text style={styles.codeCardLabel}>YOUR INVITE CODE</Text>
                    <Text style={styles.codeCardGenerated}>● GENERATED</Text>
                  </View>
                  <View style={styles.codeLetters}>
                    {generatedCode.split('').map((char, i) => (
                      <View
                        key={i}
                        style={[
                          styles.codeLetter,
                          i === 5 && styles.codeLetterAccent,
                        ]}
                      >
                        <Text style={[
                          styles.codeLetterText,
                          i === 5 && styles.codeLetterTextAccent,
                        ]}>
                          {char}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.codeHint}>
                    Share this code — anyone can join in seconds.
                  </Text>
                </LinearGradient>
              </View>
            )}

            {!!error && isCreate && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={canSubmit ? ['#9B5CFF', '#FF3D8B'] : ['#3a3048', '#3a3048']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isCreate ? 'Start the trip 🍻' : 'Join the trip 🍻'}
                  </Text>
                )}
              </LinearGradient>
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
  section: {
    gap: 7,
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.8,
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
  codeInput: {
    fontFamily: 'SpaceMono_Bold',
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
  },
  avatarPreview: {
    alignItems: 'center',
    gap: 9,
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
  codeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeCardGradient: {
    padding: 18,
    gap: 11,
  },
  codeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeCardLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#B6B0C8',
    letterSpacing: 1,
  },
  codeCardGenerated: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6BE58A',
  },
  codeLetters: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  codeLetter: {
    width: 42,
    height: 52,
    borderRadius: 11,
    backgroundColor: 'rgba(11,10,18,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(155,92,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLetterAccent: {
    borderColor: 'rgba(255,61,139,0.4)',
  },
  codeLetterText: {
    fontFamily: 'SpaceMono_Bold',
    fontSize: 25,
    color: '#F5F3FA',
  },
  codeLetterTextAccent: {
    color: '#FF7FB0',
  },
  codeHint: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 12,
    color: '#8B86A0',
    textAlign: 'center',
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
  errorText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 13,
    color: '#FF5C6E',
    textAlign: 'center',
  },
})
