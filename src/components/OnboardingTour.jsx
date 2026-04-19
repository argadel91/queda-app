import React, { useEffect, useState } from 'react'
import { theme as t } from '../theme.js'

const STORAGE_KEY = 'queda.onboardingSeen'

const SLIDES = [
  {
    icon: '📅',
    title: 'Create a plan',
    body: 'Tap the + button to post a spontaneous hangout — choose a place, date, and how many people can join.',
  },
  {
    icon: '🙋',
    title: 'Join plans',
    body: 'Browse the feed and tap any plan to request a spot. The organiser can approve instantly.',
  },
  {
    icon: '🔔',
    title: 'Stay notified',
    body: 'You\'ll get notified when someone joins your plan, when you\'re approved, and before the hangout starts.',
  },
  {
    icon: '✦',
    title: 'Build your profile',
    body: 'Show up to plans and earn trust. Others can see your reliability score before accepting your requests.',
  },
]

export default function OnboardingTour({ isAuthed }) {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (!isAuthed) return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable
    }
  }, [isAuthed])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setSlide(s => s + 1)
    } else {
      dismiss()
    }
  }

  const prev = () => setSlide(s => Math.max(0, s - 1))

  if (!visible) return null

  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to queda"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(6,6,8,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius + 4,
        padding: '32px 28px 24px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
        position: 'relative',
      }}>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip tour"
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none',
            color: t.textDim, cursor: 'pointer',
            fontSize: 13, fontFamily: t.font, fontWeight: 600,
          }}
        >
          Skip
        </button>

        <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{current.icon}</div>
        <h2 style={{ fontFamily: t.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 10px' }}>
          {current.title}
        </h2>
        <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          {current.body}
        </p>

        {/* Dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }} aria-label={`Slide ${slide + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === slide ? 20 : 6, height: 6,
              borderRadius: 999,
              background: i === slide ? t.accent : t.border,
              transition: 'width 200ms ease, background 200ms ease',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {slide > 0 && (
            <button
              type="button"
              onClick={prev}
              style={{
                flex: 1, padding: '13px 0', background: 'none',
                border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                color: t.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            style={{
              flex: 2, padding: '13px 0',
              background: t.gradient, border: 'none', borderRadius: t.radiusSm,
              color: t.accentInk, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: t.font,
            }}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
