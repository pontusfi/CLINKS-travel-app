import { forwardRef, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
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
import { supabase, Drink } from '../lib/supabase'

interface Props {
  onDrinkLogged?: () => void
}

export const LogDrinkSheet = forwardRef<BottomSheetModal, Props>(
  function LogDrinkSheet({ onDrinkLogged }, ref) {
    const [category, setCategory] = useState<DrinkCategory>('beer')
    const [drinkName, setDrinkName] = useState('')
    const [note, setNote] = useState('')

    const trip = useStore(s => s.trip)
    const currentUser = useStore(s => s.currentUser)
    const addDrink = useStore(s => s.addDrink)
    const isOffline = useStore(s => s.isOffline)
    const enqueueOffline = useStore(s => s.enqueueOffline)

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
      if (!trip || !currentUser) return

      const cat = CATEGORY_MAP[category]
      const now = new Date().toISOString()

      const optimistic: Drink = {
        id: `local-${Date.now()}`,
        trip_id: trip.id,
        user_id: currentUser.id,
        category,
        name: drinkName || null,
        note: note || null,
        logged_at: now,
      }

      addDrink(optimistic)
      close()
      onDrinkLogged?.()

      const insert = {
        trip_id: trip.id,
        user_id: currentUser.id,
        category,
        name: drinkName || null,
        note: note || null,
      }

      if (isOffline) {
        enqueueOffline(insert)
        return
      }

      const { error } = await supabase.from('drinks').insert(insert)
      if (error) {
        enqueueOffline(insert)
      }
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
