export const CATEGORIES = [
  { value: 'active',     label: 'Active',     icon: '💪' },
  { value: 'social',     label: 'Social',     icon: '💬' },
  { value: 'experience', label: 'Experience', icon: '✨' },
  { value: 'other',      label: 'Other',      icon: '➕' },
]

export const categoryLabel = v => CATEGORIES.find(c => c.value === v)?.label ?? v
export const categoryIcon = v => CATEGORIES.find(c => c.value === v)?.icon ?? '✦'
