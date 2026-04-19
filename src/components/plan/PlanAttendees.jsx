import React from 'react'
import { theme as t } from '../../theme.js'

const secTitle = { fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }
const smallGreen = {
  padding: '6px 14px', borderRadius: 8, background: t.gradient, color: t.accentInk,
  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: t.font,
}
const smallRed = {
  padding: '6px 14px', borderRadius: 8, background: t.dangerSoft, color: t.danger,
  border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
}

/**
 * Renders the pending requests list (organizer only) and the "Going" attendees list.
 * Hidden when the plan is private and the current user has not joined.
 */
export default function PlanAttendees({ plan, joined, pending, isOrg, busy, infoHidden, needsCheckout, actions }) {
  if (infoHidden) return null

  const isPast = plan.status === 'past' || plan.status === 'cancelled'

  return (
    <>
      {/* Pending requests — organizer only, before checkout */}
      {isOrg && pending.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={secTitle}>Pending requests</h3>
          {pending.map(p => (
            <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={busy} onClick={() => actions.approve(p.user_id)} style={smallGreen}>Accept</button>
                <button disabled={busy} onClick={() => actions.reject(p.user_id)} style={smallRed}>Reject</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Attendees list — shown when not in checkout mode */}
      {joined.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={secTitle}>Going ({joined.length})</h3>
          {joined.map(p => (
            <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              {p.user_id === plan.user_id && (
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>organiser</span>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
