import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { theme as t } from '../theme.js'

const SLIDES = [
  { icon: '🤝', title: 'Real plans, real people',
    body: "queda helps you meet people through spontaneous activities — sports, food, culture, anything. No swiping, no small talk. Just show up." },
  { icon: '📍', title: 'Find plans near you',
    body: "Browse a feed of plans happening in the next hours or days. Filter by category, distance, or gender. Join with one tap." },
  { icon: '🛡️', title: 'Trust keeps it real',
    body: "Your trust score shows others they can count on you. Show up to plans and it stays high. Simple." },
]

export default function Welcome() {
  const [idx, setIdx] = useState(0)
  const navigate = useNavigate()
  const slide = SLIDES[idx]
  const last = idx === SLIDES.length - 1

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>{slide.icon}</div>
        <h1 style={{ fontFamily: t.fontHead, fontSize: 24, fontWeight: 800, margin: '0 0 10px', letterSpacing: -0.5 }}>{slide.title}</h1>
        <p style={{ fontSize: 14, color: t.textDim, lineHeight: 1.6, margin: '0 0 36px' }}>{slide.body}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 24 : 8, height: 8, borderRadius: 999,
              background: i === idx ? t.accent : t.border,
              transition: 'all 200ms ease',
            }} />
          ))}
        </div>

        <button onClick={() => last ? navigate('/', { replace: true }) : setIdx(idx + 1)} style={{
          width: '100%', padding: '14px', borderRadius: t.radiusSm, border: 'none',
          background: t.gradient, color: t.accentInk,
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: t.font, letterSpacing: 0.3,
        }}>
          {last ? "Let's go" : 'Next'}
        </button>

        {!last && (
          <button onClick={() => navigate('/', { replace: true })} style={{
            marginTop: 14, background: 'none', border: 'none', color: t.textDim,
            fontSize: 13, cursor: 'pointer', fontFamily: t.font,
          }}>Skip</button>
        )}
      </div>
    </div>
  )
}
