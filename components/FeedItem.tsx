import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Drink, TripUser } from '../lib/supabase'
import { CATEGORY_MAP } from '../constants/drinks'
import { timeAgo } from '../lib/utils'

interface Props {
  drink: Drink
  users: TripUser[]
  index?: number
}

export function FeedItem({ drink, users, index = 0 }: Props) {
  const user = users.find(u => u.id === drink.user_id)
  const category = CATEGORY_MAP[drink.category] ?? CATEGORY_MAP.other
  const avatarBg = categoryColorWithAlpha(category.color, 0.18)

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 40)}
      style={styles.container}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarEmoji}>{user?.avatar_emoji ?? '👤'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.mainText}>
          <Text style={styles.userName}>{user?.display_name ?? 'Someone'}</Text>
          {' logged a '}
          <Text style={[styles.drinkLabel, { color: category.color }]}>
            {category.label} {category.emoji}
          </Text>
        </Text>
        {(drink.name || drink.note) ? (
          <Text style={styles.noteText}>
            "{drink.name || drink.note}"
          </Text>
        ) : null}
      </View>

      <Text style={styles.time}>{timeAgo(drink.logged_at)}</Text>
    </Animated.View>
  )
}

function categoryColorWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#15131D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 11,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 21,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  mainText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 14,
    color: '#E9E6F2',
    flexWrap: 'wrap',
  },
  userName: {
    fontFamily: 'SpaceGrotesk_Bold',
    color: '#F5F3FA',
  },
  drinkLabel: {
    fontFamily: 'SpaceGrotesk_Bold',
  },
  noteText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 12,
    color: '#8B86A0',
    fontStyle: 'italic',
  },
  time: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6680',
    flexShrink: 0,
  },
})
