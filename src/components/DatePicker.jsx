import React, { useState, useMemo } from 'react'
import { theme as t } from '../theme.js'
import { IconCalendar } from './Icons.jsx'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default function DatePicker({ value, onChange }) {
  const [showCal, setShowCal] = useState(false)

  const strip = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      days.push({
        iso: toISO(d),
        day: d.getDate(),
        dow: DAY_NAMES[d.getDay()],
        month: MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase(),
        isToday: i === 0,
      })
    }
    return days
  }, [])

  return (
    <div>
      {/* Horizontal strip */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {strip.map(d => {
          const sel = value === d.iso
          return (
            <button key={d.iso} type="button" onClick={() => onChange(d.iso)} style={{
              flexShrink: 0, width: 64, padding: '10px 0',
              borderRadius: t.radius, cursor: 'pointer', fontFamily: t.font,
              border: sel ? 'none' : `1px solid ${t.border}`,
              background: sel ? t.gradient : 'transparent',
              color: sel ? t.accentInk : t.text,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              transition: 'all 150ms ease',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: sel ? t.accentInk : t.textDim }}>
                {d.isToday ? 'TODAY' : d.month}
              </span>
              <span style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, lineHeight: 1.4 }}>{d.day}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: sel ? t.accentInk : t.textDim }}>{d.dow}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => setShowCal(true)} style={{
          flexShrink: 0, width: 64, padding: '10px 0',
          borderRadius: t.radius, cursor: 'pointer',
          border: `1px solid ${t.border}`, background: 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          color: t.accent,
        }}>
          <IconCalendar size={22} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
        </button>
      </div>

      {/* Calendar modal */}
      {showCal && <CalendarModal value={value} onChange={v => { onChange(v); setShowCal(false) }} onClose={() => setShowCal(false)} />}
    </div>
  )
}

function CalendarModal({ value, onChange, onClose }) {
  const today = new Date()
  const todayISO = toISO(today)
  const initial = value ? new Date(value + 'T12:00:00') : today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [selected, setSelected] = useState(value || '')

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7 // Mon=0
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } else setViewMonth(viewMonth - 1) }
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } else setViewMonth(viewMonth + 1) }

  const selDate = selected ? new Date(selected + 'T12:00:00') : null
  const selLabel = selDate ? selDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 360, background: t.bg, borderRadius: 20,
        border: `1px solid ${t.border}`, padding: '24px 20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button type="button" onClick={prev} style={navBtn}>←</button>
          <span style={{ fontFamily: t.fontHead, fontSize: 24, fontWeight: 800, lineHeight: 1.4 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={next} style={navBtn}>→</button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 1,
              color: i >= 5 ? t.accent : t.textDim,
            }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isPast = iso < todayISO
            const isSel = iso === selected
            return (
              <button key={i} type="button" disabled={isPast} onClick={() => setSelected(iso)} style={{
                aspectRatio: '1', borderRadius: 12, cursor: isPast ? 'default' : 'pointer',
                border: isSel ? 'none' : 'none',
                background: isSel ? t.gradient : 'transparent',
                color: isSel ? t.accentInk : isPast ? t.textDim : t.text,
                fontFamily: t.fontHead, fontSize: 16, fontWeight: 800, lineHeight: 1.4,
                opacity: isPast ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{day}</button>
            )
          })}
        </div>

        {/* Footer */}
        {selected && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: t.fontHead, fontSize: 20, fontWeight: 800, lineHeight: 1.4 }}>{selLabel}</div>
          </div>
        )}
        <button type="button" disabled={!selected} onClick={() => onChange(selected)} style={{
          width: '100%', padding: 14, borderRadius: t.radiusSm,
          background: selected ? t.gradient : t.bgCard,
          color: selected ? t.accentInk : t.textDim,
          border: 'none', fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'default',
          fontFamily: t.font,
        }}>Confirm</button>
      </div>
    </div>
  )
}

const navBtn = {
  width: 36, height: 36, borderRadius: 999, cursor: 'pointer',
  border: `1px solid ${t.border}`, background: 'transparent',
  color: t.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: t.font,
}
