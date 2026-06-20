import { View, Text, StyleSheet } from 'react-native'

interface Props {
  icon: string
  label: string
  value: string
  valueColor?: string
}

export function StatCard({ icon, label, value, valueColor = '#C6FF4D' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>
        {icon} <Text style={{ color: valueColor }}>{value}</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#15131D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 13,
    gap: 6,
    minWidth: '45%',
  },
  cardLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#6B6680',
    letterSpacing: 0.6,
  },
  cardValue: {
    fontFamily: 'SpaceGrotesk_Bold',
    fontSize: 17,
    color: '#F5F3FA',
  },
})
