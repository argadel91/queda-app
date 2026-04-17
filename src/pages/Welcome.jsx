import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { theme } from '../theme.js'

const SLIDES = [
  { icon: '🤝', title: 'Real plans, real people',
    body: 'queda helps you meet people through spontaneous activities — sports, food, culture, anything. No swiping, no small talk. Just show up.' },
  { icon: '📍', title: 'Find plans near you',
    body: 'Browse a feed of plans happening in the next hours or days. Filter by category, distance, or gender. Join with one tap.' },
  { icon: '🎟️', title: 'Tokens keep it fair',
    body: 'You start with 6 tokens. Joining costs 1 — you get it back if you show up. Create plans for free and earn +1 when they happen.' },
]

export default function Welcome() {
  const [idx, setIdx] = useState(0)
  const navigate = useNavigate()
  const slide = SLIDES[idx]
  const last = idx === SLIDES.length - 1

  return (
    <div style={{
      minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{slide.icon}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', letterSpacing: 0.3 }}>{slide.title}</h1>
        <p style={{ fontSize: 14, color: theme.textDim, lineHeight: 1.6, margin: '0 0 32px' }}>{slide.body}</p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 20 : 8, height: 8, borderRadius: 999,
              background: i === idx ? theme.accent : theme.border,
              transition: 'width 200ms ease',
            }} />
          ))}
        </div>

        <button onClick={() => last ? navigate('/', { replace: true }) : setIdx(idx + 1)} style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          background: theme.accent, color: theme.accentInk,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font, letterSpacing: 0.5,
        }}>
          {last ? 'Let's go' : 'Next'}
        </button>

        {!last && (
          <button onClick={() => navigate('/', { replace: true })} style={{
            marginTop: 12, background: 'none', border: 'none', color: theme.textDim,
            fontSize: 13, cursor: 'pointer', fontFamily: theme.font,
          }}>Skip</button>
        )}
      </div>
    </div>
  )
}
