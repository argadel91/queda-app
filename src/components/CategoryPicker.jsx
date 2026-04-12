import React from 'react'
import CATEGORIES from '../constants/categories.js'

export default function CategoryPicker({ value, onChange, lang, c, exclude }) {
  const cats = exclude ? CATEGORIES.filter(cat => !exclude.includes(cat.slug)) : CATEGORIES
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {cats.map(cat => {
        const active = value === cat.slug
        return (
          <button key={cat.slug} onClick={() => onChange(active ? '' : cat.slug)} style={{
            padding: '8px 14px', borderRadius: '20px',
            border: `1px solid ${active ? c.A : c.BD}`,
            background: active ? `${c.A}18` : 'transparent',
            color: active ? c.A : c.T,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: active ? '700' : '400',
            transition: 'all .15s'
          }}>
            {cat.emoji} {cat.labels[lang] || cat.labels.en}
          </button>
        )
      })}
    </div>
  )
}
