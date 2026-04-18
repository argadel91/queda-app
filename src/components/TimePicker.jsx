import React, { useState } from 'react'
import { theme as t } from '../theme.js'

const SLOTS = {
  morning:   { label: 'Morning',   hours: [6,7,8,9,10,11] },
  afternoon: { label: 'Afternoon', hours: [12,13,14,15,16,17] },
  evening:   { label: 'Evening',   hours: [18,19,20,21] },
  night:     { label: 'Night',     hours: [22,23,0,1,2,3,4,5] },
}

const pad = n => String(n).padStart(2, '0')

export default function TimePicker({ value, onChange }) {
  const [slot, setSlot] = useState('')
  const [hour, setHour] = useState(null)
  const [minute, setMinute] = useState(null)

  const selectSlot = s => { setSlot(s); setHour(null); setMinute(null); onChange('') }
  const selectHour = h => { setHour(h); setMinute(null); onChange('') }
  const selectMinute = m => {
    setMinute(m)
    onChange(`${pad(hour)}:${pad(m)}`)
  }

  const summary = hour !== null && minute !== null ? `${pad(hour)}:${pad(minute)}` : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Step 1: Time slot pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Object.entries(SLOTS).map(([k, v]) => (
          <button key={k} type="button" onClick={() => selectSlot(k)} style={{
            flex: 1, padding: '10px 0', borderRadius: t.radiusSm, cursor: 'pointer',
            border: slot === k ? 'none' : `1px solid ${t.border}`,
            background: slot === k ? t.gradient : 'transparent',
            color: slot === k ? t.accentInk : t.textDim,
            fontSize: 11, fontWeight: 700, fontFamily: t.font,
            transition: 'all 150ms ease',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Step 2: Hours grid */}
      {slot && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SLOTS[slot].hours.map(h => {
            const sel = hour === h
            return (
              <button key={h} type="button" onClick={() => selectHour(h)} style={{
                padding: 12, borderRadius: t.radiusSm, cursor: 'pointer',
                border: sel ? `1px solid ${t.accentSoft}` : `1px solid ${t.border}`,
                background: sel ? t.accentSoft : 'transparent',
                color: sel ? t.accent : t.text,
                fontFamily: t.fontHead, fontSize: 17, fontWeight: 800, lineHeight: 1.4,
                transition: 'all 150ms ease',
              }}>{pad(h)}:00</button>
            )
          })}
        </div>
      )}

      {/* Step 3: Minutes */}
      {hour !== null && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: t.textDim, fontWeight: 700, marginBottom: 8 }}>
            Exact time
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[0, 15, 30, 45].map(m => {
              const sel = minute === m
              return (
                <button key={m} type="button" onClick={() => selectMinute(m)} style={{
                  padding: 12, borderRadius: t.radiusSm, cursor: 'pointer',
                  border: sel ? 'none' : `1px solid ${t.border}`,
                  background: sel ? t.gradient : 'transparent',
                  color: sel ? t.accentInk : t.text,
                  fontFamily: t.fontHead, fontSize: 16, fontWeight: 800, lineHeight: 1.4,
                  transition: 'all 150ms ease',
                }}>:{pad(m)}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontFamily: t.fontHead, fontSize: 20, fontWeight: 800, lineHeight: 1.4 }}>{summary}</div>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>selected</div>
        </div>
      )}
    </div>
  )
}
