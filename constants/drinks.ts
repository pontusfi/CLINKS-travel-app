export type DrinkCategory = 'beer' | 'wine' | 'shot' | 'cocktail' | 'soft' | 'other'

export interface DrinkCategoryDef {
  id: DrinkCategory
  label: string
  emoji: string
  color: string
}

export const DRINK_CATEGORIES: DrinkCategoryDef[] = [
  { id: 'beer',     label: 'Beer',     emoji: '🍺', color: '#FFB23D' },
  { id: 'wine',     label: 'Wine',     emoji: '🍷', color: '#FF5C6E' },
  { id: 'shot',     label: 'Shot',     emoji: '🥃', color: '#FF3D8B' },
  { id: 'cocktail', label: 'Cocktail', emoji: '🍸', color: '#35E2FF' },
  { id: 'soft',     label: 'Soft',     emoji: '🧃', color: '#6BE58A' },
  { id: 'other',    label: 'Other',    emoji: '✨', color: '#B98CFF' },
]

export const CATEGORY_MAP: Record<DrinkCategory, DrinkCategoryDef> = Object.fromEntries(
  DRINK_CATEGORIES.map(c => [c.id, c])
) as Record<DrinkCategory, DrinkCategoryDef>

export const AVATAR_OPTIONS = [
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐧', '🦄', '🐙', '🐸', '🐵', '🐷', '🐶',
]

export const AVATAR_BG_COLORS: Record<string, string> = {
  '🦊': '#FF9F45',
  '🐼': '#6BE58A',
  '🐨': '#5CC8FF',
  '🦁': '#FFCD45',
  '🐯': '#FF7A45',
  '🐧': '#B98CFF',
  '🦄': '#FF6FD8',
  '🐙': '#45D6C8',
  '🐸': '#9DE84F',
  '🐵': '#C6FF4D',
  '🐷': '#FFB2C6',
  '🐶': '#FFD97D',
}
