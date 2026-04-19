import React from 'react'
import { categoryIcon, categoryLabel } from '../../constants/categories.js'
import { formatTrust } from '../../lib/trust.js'
import { theme as t } from '../../theme.js'

// Row helper shared across plan sub-components
export function Row({ icon, value, sub }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
      <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div>
        <div>{value}</div>
        {sub && <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

/**
 * Renders the plan title, category label, organizer credit with trust score,
 * and the info grid (date/time, location, capacity, join mode, gender, etc.).
 */
export default function PlanHeader({ plan, organizer, joined, infoHidden }) {
  const d = new Date(plan.date + 'T' + plan.time)
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const priv = plan.join_mode === 'private'
  const isFull = joined.length >= plan.capacity

  return (
    <>
      <div style={{ fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
        {categoryIcon(plan.category)} {categoryLabel(plan.category)}
        {plan.status === 'cancelled' && <span style={{ color: t.danger, marginLeft: 8 }}>CANCELLED</span>}
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{plan.title}</h1>

      {!infoHidden && organizer && (
        <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20 }}>
          by {organizer.username || 'Anonymous'}
          <span style={{ marginLeft: 8, color: organizer.trust < 0 ? t.textDim : t.accent, fontWeight: 600 }}>
            {formatTrust(organizer.trust)}
          </span>
        </div>
      )}
      {infoHidden && (
        <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20 }}>
          🔒 Private plan — request to join to see details
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, padding: '16px 18px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <Row icon="📅" value={`${dateStr} · ${timeStr}`} />
        <Row icon="📍" value={infoHidden ? 'Location revealed after joining' : plan.place_name} sub={infoHidden ? null : plan.place_address} />
        {!infoHidden && <Row icon="👥" value={`${joined.length} / ${plan.capacity}${isFull ? ' · full' : ''}`} />}
        <Row icon={priv ? '🔒' : '🔓'} value={plan.join_mode === 'approval' ? 'Needs approval' : plan.join_mode === 'private' ? 'Private' : 'Open'} />
        <Row icon="⚥" value={plan.gender_filter === 'mixed' ? 'Mixed' : plan.gender_filter === 'male' ? 'Men only' : 'Women only'} />
        {plan.min_attendees > 2 && <Row icon="👥" value={`Minimum ${plan.min_attendees} people to go ahead`} />}
        {plan.min_trust > 0 && <Row icon="🛡️" value={`Requires ${plan.min_trust}% trust`} />}
        {!infoHidden && plan.description && <Row icon="📝" value={plan.description} />}
      </div>
    </>
  )
}
