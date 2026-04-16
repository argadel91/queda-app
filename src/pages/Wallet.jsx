import React, { useState } from 'react'
import { useTokens } from '../hooks/useTokens.js'
import TokenHistory from '../components/TokenHistory.jsx'
import { theme } from '../theme.js'

const FAQ = [
  { q: 'How do I earn tokens?',
    a: 'Attend plans you join (your 2-token deposit comes back, +1 more if the organizer thumbs-ups you). Run plans that execute — get your deposit back plus 1 to 4 bonus tokens depending on how many attendees you thumbed-up. Invite friends who complete signup (+2 each).' },
  { q: 'How do I lose them?',
    a: 'Joining a plan costs 2 tokens as a deposit. You lose them if you no-show or cancel past the plan’s deadline. Organizers lose 2 if they cancel late or don’t show up themselves.' },
  { q: 'What’s the weekly regen?',
    a: 'If your balance drops to 0 or 1, you get +1 free token every 7 days. Balance of 2 or higher, no regen.' },
  { q: 'Is there a cap?',
    a: 'Yes — 21 tokens max. Extra credits stop there.' },
]

export default function Wallet() {
  const { balance, history, loading } = useTokens()
  const [openIdx, setOpenIdx] = useState(null)
  const inRegen = balance !== null && balance <= 1

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
        <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Balance</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: theme.accent, letterSpacing: -2, lineHeight: 1 }}>
          {loading ? '—' : balance ?? '—'}
        </div>
        <div style={{ fontSize: 13, color: theme.textDim, marginTop: 6 }}>tokens</div>
        {inRegen && (
          <div style={{
            marginTop: 16, padding: '8px 14px', borderRadius: 999,
            background: theme.bgElev, border: `1px solid ${theme.border}`,
            display: 'inline-block', fontSize: 12, color: theme.accent, fontWeight: 600,
          }}>
            Weekly regen active · +1/week
          </div>
        )}
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>How it works</h2>
        {FAQ.map((f, i) => (
          <div key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{
            padding: '14px 0', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: theme.text }}>{f.q}</span>
              <span style={{ color: theme.textDim, fontSize: 18, lineHeight: 1 }}>{openIdx === i ? '−' : '+'}</span>
            </div>
            {openIdx === i && (
              <p style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.5, margin: '10px 0 0' }}>{f.a}</p>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>History</h2>
        <TokenHistory entries={history} />
      </section>
    </div>
  )
}
