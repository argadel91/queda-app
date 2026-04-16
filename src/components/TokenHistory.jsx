import React from 'react'
import { theme } from '../theme.js'

// Human-readable labels for ledger.reason values written by the SQL functions.
// Keep in sync with sql/migration_v3_tokens.sql.
const LABELS = {
  signup: 'Signed up',
  weekly_regen: 'Weekly regen',
  invite_friend_completed: 'Friend joined',
  create_plan_deposit: 'Plan deposit',
  organizer_refund_executed: 'Plan executed',
  organizer_pending_reward: 'Plan reward',
  organizer_refund_no_attendees: 'No one joined',
  organizer_no_show_refund: 'Organizer no-show refund',
  organizer_no_show_penalty: 'You didn’t show up (organizer)',
  thumbs_bonus_tier_1: 'Thumbs-up bonus',
  thumbs_bonus_tier_2: 'Thumbs-up bonus (half)',
  thumbs_bonus_tier_3: 'Thumbs-up bonus (everyone)',
  join_plan_deposit: 'Joined a plan',
  attended_refund: 'Attended a plan',
  attended_thumbs_up_bonus: 'Thumbs-up from organizer',
  attended_no_thumbs: 'Attended (no thumbs-up)',
  no_show_penalty: 'You didn’t show up',
  cancel_refund_attendee: 'Plan cancelled (refund)',
  cancel_refund_organizer_ontime: 'You cancelled in time',
  cancel_penalty_organizer_late: 'You cancelled late',
  leave_refund_ontime: 'Left in time',
  leave_penalty_late: 'Left late',
  passport_redeem: 'Passport unlocked',
}

const label = reason => LABELS[reason] || reason.replace(/_/g, ' ')

const fmtDateTime = ts => {
  const d = new Date(ts)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export default function TokenHistory({ entries }) {
  if (!entries?.length) {
    return <p style={{ color: theme.textDim, fontSize: 13 }}>No movements yet.</p>
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {entries.map(e => {
        const positive = e.amount > 0
        const neutral = e.amount === 0
        const color = neutral ? theme.textDim : positive ? theme.accent : theme.danger
        return (
          <li key={e.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: `1px solid ${theme.border}`, gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label(e.reason)}
              </div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{fmtDateTime(e.created_at)}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: 0.5, flexShrink: 0 }}>
              {neutral ? '—' : `${positive ? '+' : ''}${e.amount}`}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
