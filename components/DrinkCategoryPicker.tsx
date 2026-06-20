import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { DRINK_CATEGORIES, DrinkCategory } from '../constants/drinks'

interface Props {
  selected: DrinkCategory
  onSelect: (cat: DrinkCategory) => void
}

export function DrinkCategoryPicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {DRINK_CATEGORIES.map(cat => {
        const isSelected = cat.id === selected
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.75}
            style={[
              styles.tile,
              isSelected
                ? { backgroundColor: hexAlpha(cat.color, 0.18), borderColor: cat.color, borderWidth: 2 }
                : styles.tileDefault,
            ]}
          >
            <Text style={styles.tileEmoji}>{cat.emoji}</Text>
            <Text style={[styles.tileLabel, { color: isSelected ? '#F5F3FA' : '#B6B0C8' }]}>
              {cat.label}
            </Text>
            {isSelected && (
              <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30.5%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  tileDefault: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tileEmoji: {
    fontSize: 32,
  },
  tileLabel: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 13,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#0B0A12',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_Bold',
  },
})
