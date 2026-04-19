import React, { useState } from 'react'
import { theme as t } from '../../theme.js'

const accentBtn = {
  width: '100%', padding: '14px', borderRadius: t.radiusSm, fontWeight: 700, fontSize: 15,
  fontFamily: t.font, letterSpacing: 0.3, cursor: 'pointer',
  background: t.gradient, color: t.accentInk, border: 'none',
}
const dangerBtn = {
  width: '100%', padding: '12px', borderRadius: t.radiusSm, fontWeight: 600, fontSize: 13,
  fontFamily: t.font, cursor: 'pointer',
  background: t.dangerSoft, color: t.danger, border: 'none',
}

/**
 * Renders the action area: join/leave/cancel/finalise buttons depending on who
 * the current user is (organizer vs attendee) and the plan's current state.
 * Also handles the checkout section for the organizer.
 */
export default function PlanActions({
  plan,
  user,
  joined,
  myStatus,
  busy,
  err,
  attendance,
  setAttendance,
  actions,
}) {
  const [copyMsg, setCopyMsg] = useState('')
  const isOrg = user?.id === plan.user_id
  const isParticipant = myStatus === 'joined' || myStatus === 'pending' || isOrg
  const priv = plan.join_mode === 'private'
  const isFull = joined.length >= plan.capacity
  const isPast = plan.status === 'past' || plan.status === 'cancelled'
  const planTs = new Date(plan.date + 'T' + plan.time)
  const needsCheckout = isOrg && planTs < new Date() && !plan.checked_out_at && plan.status !== 'cancelled'

  return (
    <>
      {/* Copy link (organizer) */}
      {isOrg && (
        <>
          <button
            onClick={() => {
              const url = `${window.location.origin}/plan/${plan.id}`
              navigator.clipboard?.writeText(url)
              setCopyMsg('Link copied!')
              setTimeout(() => setCopyMsg(''), 2000)
            }}
            style={{
              width: '100%', padding: '11px', borderRadius: t.radiusSm, marginBottom: copyMsg ? 8 : 16,
              background: t.bgCard, border: `1px solid ${t.border}`,
              color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
            }}
          >
            📋 Copy plan link
          </button>
          {copyMsg && <p style={{ color: t.accent, fontSize: 13, marginBottom: 12 }}>{copyMsg}</p>}
        </>
      )}

      {err && <p style={{ color: t.danger, fontSize: 13, marginBottom: 12 }}>{err}</p>}

      {/* Checkout section */}
      {needsCheckout && joined.length > 0 && (
        <section style={{ marginBottom: 24, padding: '18px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radius }}>
          <h3 style={secTitle}>Check out — who showed up?</h3>
          {joined.map(p => (
            <label key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={attendance[p.user_id] ?? true}
                onChange={e => setAttendance(prev => ({ ...prev, [p.user_id]: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: t.accent, flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: (attendance[p.user_id] ?? true) ? t.accent : t.danger }}>
                {(attendance[p.user_id] ?? true) ? '✓ attended' : '✗ no-show'}
              </span>
            </label>
          ))}
          <button disabled={busy} onClick={actions.finalise} style={{ ...accentBtn, marginTop: 16 }}>
            {busy ? 'Processing…' : 'Finalise plan'}
          </button>
        </section>
      )}

      {needsCheckout && joined.length === 0 && (
        <section style={{ marginBottom: 24 }}>
          <p style={{ color: t.textDim, fontSize: 14, marginBottom: 12 }}>No one joined.</p>
          <button disabled={busy} onClick={actions.finalise} style={accentBtn}>{busy ? '…' : 'Finalise (no attendees)'}</button>
        </section>
      )}

      {/* Checked-out banner */}
      {plan.checked_out_at && (
        <div style={{ padding: '12px 16px', borderRadius: t.radiusSm, background: t.accentSoft, marginBottom: 20, fontSize: 13, color: t.accent, fontWeight: 600 }}>
          ✓ Checked out {plan.auto_checked_out ? '(auto — 48h)' : ''} · {new Date(plan.checked_out_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* Attendee actions */}
      {!isOrg && user && !isPast && !needsCheckout && (
        <div style={{ marginBottom: 20 }}>
          {!myStatus && !isFull && (
            <button disabled={busy} onClick={actions.join} style={accentBtn}>
              {busy ? '…' : (priv || plan.join_mode === 'approval') ? 'Request to join' : 'Join'}
            </button>
          )}
          {!myStatus && isFull && <p style={{ fontSize: 14, color: t.textDim }}>Plan is full.</p>}
          {myStatus === 'joined' && (
            <>
              <p style={{ fontSize: 14, color: t.accent, fontWeight: 600, marginBottom: 8 }}>{"✓ You're in"}</p>
              <button disabled={busy} onClick={actions.leave} style={dangerBtn}>{busy ? '…' : 'Leave plan'}</button>
            </>
          )}
          {myStatus === 'pending' && (
            <>
              <p style={{ fontSize: 14, color: t.textDim, fontWeight: 600, marginBottom: 8 }}>⏳ Pending approval</p>
              <button disabled={busy} onClick={actions.leave} style={dangerBtn}>{busy ? '…' : 'Withdraw request'}</button>
            </>
          )}
        </div>
      )}

      {/* Organizer cancel (before plan time) */}
      {isOrg && !isPast && !needsCheckout && (
        <div style={{ marginBottom: 24 }}>
          <button disabled={busy} onClick={actions.cancel} style={dangerBtn}>{busy ? '…' : 'Cancel plan'}</button>
        </div>
      )}
    </>
  )
}

const secTitle = { fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }
