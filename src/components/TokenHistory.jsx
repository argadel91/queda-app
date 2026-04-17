import React from 'react'
import { theme as t } from '../theme.js'

const LABELS = {
  signup: 'Signed up',
  join_plan_deposit: 'Joined a plan',
  attended_refund: 'Attended',
  no_show_penalty: "Didn't show up",
  create_plan_free: 'Created a plan',
  organizer_plan_executed: 'Plan executed',
  organizer_no_show_refund: 'Organiser no-show refund',
  cancel_refund: 'Plan cancelled (refund)',
  leave_refund: 'Left in time',
  leave_late_penalty: 'Left late',
  reject_refund: 'Request rejected (refund)',
}

const label = reason => LABELS[reason] || reason.replace(/_/g, ' ')

const fmtDateTime = ts => {
  const d = new Date(ts)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export default function TokenHistory({ entries }) {
  if (!entries?.length) {
    return <p style={{ color: t.textDim, fontSize: 13, padding: '12px 0' }}>No movements yet.</p>
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {entries.map(e => {
        const positive = e.amount > 0
        const neutral = e.amount === 0
        const color = neutral ? t.textDim : positive ? t.accent : t.danger
        return (
          <li key={e.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: `1px solid ${t.border}`, gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(e.reason)}</div>
              <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>{fmtDateTime(e.created_at)}</div>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color,
              background: positive ? t.accentSoft : neutral ? t.bgCard : t.dangerSoft,
              padding: '3px 10px', borderRadius: 999, flexShrink: 0,
            }}>
              {neutral ? '—' : `${positive ? '+' : ''}${e.amount}`}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
