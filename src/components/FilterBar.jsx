import React, { useState, useEffect } from 'react'
import CATEGORIES from '../constants/categories.js'

export default function FilterBar({ filters, onChange, lang, c }) {
  const [catOpen, setCatOpen] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!catOpen) return
    const handleKey = e => { if (e.key === 'Escape') setCatOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [catOpen])

  const setFilter = (key, val) => onChange({ ...filters, [key]: val })

  const DATE_OPTIONS = [
    { value: '', label: { es: 'Cualquier fecha', en: 'Any date', pt: 'Qualquer data', fr: "N'importe quand", de: 'Jedes Datum', it: 'Qualsiasi data' } },
    { value: 'today', label: { es: 'Hoy', en: 'Today', pt: 'Hoje', fr: "Aujourd'hui", de: 'Heute', it: 'Oggi' } },
    { value: 'week', label: { es: 'Esta semana', en: 'This week', pt: 'Esta semana', fr: 'Cette semaine', de: 'Diese Woche', it: 'Questa settimana' } },
    { value: 'month', label: { es: 'Este mes', en: 'This month', pt: 'Este mês', fr: 'Ce mois', de: 'Dieser Monat', it: 'Questo mese' } },
  ]

  const DISTANCE_OPTIONS = [
    { value: '', label: { es: 'Cualquier distancia', en: 'Any distance', pt: 'Qualquer distância', fr: "N'importe où", de: 'Jede Entfernung', it: 'Qualsiasi distanza' } },
    { value: '5', label: { es: '< 5 km', en: '< 5 km', pt: '< 5 km', fr: '< 5 km', de: '< 5 km', it: '< 5 km' } },
    { value: '10', label: { es: '< 10 km', en: '< 10 km', pt: '< 10 km', fr: '< 10 km', de: '< 10 km', it: '< 10 km' } },
    { value: '25', label: { es: '< 25 km', en: '< 25 km', pt: '< 25 km', fr: '< 25 km', de: '< 25 km', it: '< 25 km' } },
    { value: '50', label: { es: '< 50 km', en: '< 50 km', pt: '< 50 km', fr: '< 50 km', de: '< 50 km', it: '< 50 km' } },
  ]

  const selectStyle = {
    background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '8px',
    padding: '6px 10px', color: c.T, fontSize: '12px', fontFamily: 'inherit',
    outline: 'none', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    paddingRight: '24px'
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {/* Category chips */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setCatOpen(o => !o)} aria-expanded={catOpen} aria-haspopup="listbox" aria-label={lang === 'es' ? 'Categoría' : 'Category'} style={{
          ...selectStyle, cursor: 'pointer',
          border: `1px solid ${filters.category ? c.A : c.BD}`,
          color: filters.category ? c.A : c.T
        }}>
          {filters.category
            ? `${CATEGORIES.find(cat => cat.slug === filters.category)?.emoji || ''} ${CATEGORIES.find(cat => cat.slug === filters.category)?.labels[lang] || filters.category}`
            : (lang === 'es' ? 'Categoría' : 'Category')
          } ▾
        </button>
        {catOpen && (
          <div role="listbox" aria-label={lang === 'es' ? 'Categorías' : 'Categories'} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 50, maxHeight: '250px', overflowY: 'auto', minWidth: '180px' }}>
            <div onClick={() => { setFilter('category', ''); setCatOpen(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: !filters.category ? c.A : c.T, fontWeight: !filters.category ? '700' : '400', borderBottom: `1px solid ${c.BD}` }}>
              {lang === 'es' ? 'Todas' : 'All'}
            </div>
            {CATEGORIES.map(cat => (
              <div key={cat.slug} onClick={() => { setFilter('category', cat.slug); setCatOpen(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: filters.category === cat.slug ? c.A : c.T, fontWeight: filters.category === cat.slug ? '700' : '400', borderBottom: `1px solid ${c.BD}` }}
                onMouseEnter={e => e.currentTarget.style.background = c.CARD2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cat.emoji} {cat.labels[lang] || cat.labels.en}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date filter */}
      <select value={filters.dateRange || ''} onChange={e => setFilter('dateRange', e.target.value)} style={selectStyle}>
        {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label[lang] || o.label.en}</option>)}
      </select>

      {/* Distance filter */}
      <select value={filters.radiusKm || ''} onChange={e => setFilter('radiusKm', e.target.value)} style={selectStyle}>
        {DISTANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label[lang] || o.label.en}</option>)}
      </select>
    </div>
  )
}
