import { forwardRef, useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet'
import { DrinkCategoryPicker } from './DrinkCategoryPicker'
import { DrinkCategory, CATEGORY_MAP } from '../constants/drinks'
import { useStore } from '../lib/store'
import { listPresets } from '../lib/presets'
import type { DrinkPreset } from '../lib/supabase'

interface Props {
  onDrinkLogged?: () => void
}

export const LogDrinkSheet = forwardRef<BottomSheetModal, Props>(
  function LogDrinkSheet({ onDrinkLogged }, ref) {
    const [category, setCategory] = useState<DrinkCategory>('beer')
    const [drinkName, setDrinkName] = useState('')
    const [note, setNote] = useState('')

    const logDrink = useStore(s => s.logDrink)
    const session = useStore(s => s.session)

    const [presets, setPresets] = useState<DrinkPreset[]>([])
    useEffect(() => {
      const userId = session?.user?.id
      if (!userId) return
      let active = true
      // Presets are a convenience; a failure here shouldn't stop you logging
      // the long way round, so the sheet just renders without them.
      listPresets(userId)
        .then(rows => { if (active) setPresets(rows) })
        .catch(() => {})
      return () => { active = false }
    }, [session?.user?.id])

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      [],
    )

    function close() {
      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss()
      }
      setDrinkName('')
      setNote('')
      setCategory('beer')
    }

    async function handleLog() {
      const ok = await logDrink({ category, name: drinkName, note })
      if (!ok) return
      close()
      onDrinkLogged?.()
    }

    async function handleLogPreset(preset: DrinkPreset) {
      const ok = await logDrink({ category: preset.category, name: preset.name })
      if (!ok) return
      close()
      onDrinkLogged?.()
    }

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['65%']}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.title}>What are you drinking?</Text>

          {presets.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.presetLabel}>YOUR USUALS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetRow}
                keyboardShouldPersistTaps="handled"
              >
                {presets.map(preset => {
                  const cat = CATEGORY_MAP[preset.category] ?? CATEGORY_MAP.other
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => handleLogPreset(preset)}
                      style={styles.presetChip}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.presetChipEmoji}>{cat.emoji}</Text>
                      <Text style={styles.presetChipText} numberOfLines={1}>
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          <DrinkCategoryPicker selected={category} onSelect={setCategory} />

          <BottomSheetTextInput
            value={drinkName}
            onChangeText={setDrinkName}
            placeholder="Name it (optional) — Spicy Margarita"
            placeholderTextColor="#5C5870"
            style={styles.input}
          />

          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional) 📝"
            placeholderTextColor="#5C5870"
            style={styles.input}
          />

          <TouchableOpacity onPress={handleLog} activeOpacity={0.85}>
            <LinearGradient
              colors={['#9B5CFF', '#FF3D8B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logButton}
            >
              <Text style={styles.logButtonText}>Log it 🍻</Text>
            </LinearGradient>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    )
  },
)

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#16141F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 15,
  },
  title: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 22,
    color: '#F5F3FA',
  },
  presetLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    letterSpacing: 0.8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(155,92,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(155,92,255,0.3)',
    maxWidth: 190,
  },
  presetChipEmoji: {
    fontSize: 15,
  },
  presetChipText: {
    fontFamily: 'SpaceGrotesk_Medium',
    fontSize: 14,
    color: '#F5F3FA',
    flexShrink: 1,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#F5F3FA',
    fontFamily: 'SpaceGrotesk',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  logButton: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 18,
    color: '#fff',
  },
})
