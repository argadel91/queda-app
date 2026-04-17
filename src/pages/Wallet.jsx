import React from 'react'
import { useTokens } from '../hooks/useTokens.js'
import TokenHistory from '../components/TokenHistory.jsx'
import { theme } from '../theme.js'

const RULES = [
  { icon: '🎟️', text: 'You start with 6 tokens',   badge: '+6', color: theme.accent },
  { icon: '🙋', text: 'Join a plan',                badge: '−1', color: theme.danger },
  { icon: '✅', text: 'Show up (confirmed)',         badge: '+1', color: theme.accent },
  { icon: '👻', text: 'Don't show up',              badge: '−1', color: theme.danger },
  { icon: '📣', text: 'Create a plan (free)',        badge: '0',  color: theme.textDim },
  { icon: '🎉', text: 'Your plan runs (≥1 person)', badge: '+1', color: theme.accent },
]

export default function Wallet() {
  const { balance, history, loading } = useTokens()

  return (
    <div>
      {/* Balance */}
      <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
        <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Balance</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: theme.accent, letterSpacing: -2, lineHeight: 1 }}>
          {loading ? '—' : balance ?? '—'}
        </div>
        <div style={{ fontSize: 13, color: theme.textDim, marginTop: 6 }}>
          tokens <span style={{ opacity: 0.5 }}>· 12 max</span>
        </div>
      </div>

      {/* Rules */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>How it works</h2>
        {RULES.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: `1px solid ${theme.border}`,
          }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 14, color: theme.text }}>{r.text}</span>
            <span style={{
              fontSize: 13, fontWeight: 700, color: r.color,
              background: theme.bgElev, border: `1px solid ${theme.border}`,
              borderRadius: 999, padding: '4px 10px', flexShrink: 0,
            }}>{r.badge}</span>
          </div>
        ))}
      </section>

      {/* History */}
      <section>
        <h2 style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>History</h2>
        <TokenHistory entries={history} />
      </section>
    </div>
  )
}
