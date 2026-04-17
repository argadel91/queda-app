import React from 'react'
import { useTokens } from '../hooks/useTokens.js'
import TokenHistory from '../components/TokenHistory.jsx'
import { theme } from '../theme.js'

const S = {
  section: { fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${theme.border}` },
  icon: { width: 36, height: 36, borderRadius: '50%', background: theme.bgElev, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 },
  text: { flex: 1, fontSize: 14, color: theme.text },
  badge: base => ({
    fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px', flexShrink: 0,
    background: theme.bgElev, border: `1px solid ${theme.border}`, ...base,
  }),
}

const green = { color: theme.accent }
const red = { color: theme.danger }
const grey = { color: theme.textDim }

export default function Wallet() {
  const { balance, history, loading } = useTokens()

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {/* Balance */}
      <div style={{ textAlign: 'center', padding: '24px 0 28px' }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: theme.accent, letterSpacing: -2, lineHeight: 1 }}>
          {loading ? '—' : balance ?? '—'}
        </div>
        <div style={{ fontSize: 13, color: theme.textDim, marginTop: 8 }}>
          6 tokens to start · 12 max
        </div>
      </div>

      {/* Joining a plan */}
      <h2 style={S.section}>Joining a plan</h2>
      <div style={S.row}>
        <div style={S.icon}>📋</div>
        <span style={S.text}>You join a plan</span>
        <span style={S.badge(red)}>−1</span>
      </div>
      <div style={S.row}>
        <div style={S.icon}>✅</div>
        <span style={S.text}>You show up</span>
        <span style={S.badge(green)}>+1</span>
      </div>
      <div style={S.row}>
        <div style={S.icon}>❌</div>
        <span style={S.text}>You don't show up</span>
        <span style={S.badge(red)}>lost</span>
      </div>

      {/* Creating a plan */}
      <h2 style={{ ...S.section, marginTop: 24 }}>Creating a plan</h2>
      <div style={S.row}>
        <div style={S.icon}>✨</div>
        <span style={S.text}>Create a plan</span>
        <span style={S.badge(grey)}>free</span>
      </div>
      <div style={S.row}>
        <div style={S.icon}>🎉</div>
        <span style={S.text}>Plan happens</span>
        <span style={S.badge(green)}>+1</span>
      </div>

      {/* CTA banner */}
      <div style={{
        marginTop: 24, padding: '14px 16px', borderRadius: 12,
        background: theme.accent, color: theme.accentInk,
        textAlign: 'center', fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
      }}>
        Want more tokens? Create plans.
      </div>

      {/* History */}
      <section style={{ marginTop: 32 }}>
        <h2 style={S.section}>History</h2>
        <TokenHistory entries={history} />
      </section>
    </div>
  )
}
