import React from 'react'
import { useTokens } from '../hooks/useTokens.js'
import TokenHistory from '../components/TokenHistory.jsx'
import { theme as t } from '../theme.js'

const RULES = [
  { icon: '📋', text: 'You join a plan', badge: '−1', color: t.danger },
  { icon: '✅', text: 'You show up', badge: '+1', color: t.accent },
  { icon: '❌', text: "You don't show up", badge: 'lost', color: t.danger },
  { icon: '✨', text: 'Create a plan', badge: 'free', color: t.textDim },
  { icon: '🎉', text: 'Plan happens', badge: '+1', color: t.accent },
]

export default function Wallet() {
  const { balance, history, loading } = useTokens()

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '28px 0 32px' }}>
        <div style={{ fontSize: 72, fontWeight: 800, fontFamily: t.fontHead, background: t.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -3, lineHeight: 1 }}>
          {loading ? '—' : balance ?? '—'}
        </div>
        <div style={{ fontSize: 13, color: t.textDim, marginTop: 8 }}>
          6 to start · 12 max
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>How it works</h2>
        {RULES.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: `1px solid ${t.border}`,
          }}>
            <span style={{ fontSize: 20, width: 36, height: 36, borderRadius: '50%', background: t.bgCard, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{r.text}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: r.color, background: r.color === t.accent ? t.accentSoft : r.color === t.danger ? t.dangerSoft : t.bgCard, padding: '3px 10px', borderRadius: 999, flexShrink: 0 }}>{r.badge}</span>
          </div>
        ))}
      </section>

      <div style={{
        padding: '14px 16px', borderRadius: t.radius,
        background: t.gradient, color: t.accentInk,
        textAlign: 'center', fontSize: 14, fontWeight: 700, letterSpacing: 0.3, marginBottom: 28,
      }}>
        Want more tokens? Create plans.
      </div>

      <section>
        <h2 style={{ fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>History</h2>
        <TokenHistory entries={history} />
      </section>
    </div>
  )
}
