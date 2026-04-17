export const CATEGORIES = [
  { value: 'sports',       label: 'Sports',         icon: '⚽' },
  { value: 'food_drinks',  label: 'Food & Drinks',  icon: '🍺' },
  { value: 'culture',      label: 'Culture',        icon: '🎭' },
  { value: 'outdoor',      label: 'Outdoor',        icon: '🥾' },
  { value: 'games',        label: 'Games',          icon: '🎮' },
  { value: 'social',       label: 'Social',         icon: '💬' },
  { value: 'wellness',     label: 'Wellness',       icon: '🧘' },
  { value: 'other',        label: 'Other',          icon: '✦' },
]

export const categoryLabel = v => CATEGORIES.find(c => c.value === v)?.label ?? v
export const categoryIcon = v => CATEGORIES.find(c => c.value === v)?.icon ?? '✦'
