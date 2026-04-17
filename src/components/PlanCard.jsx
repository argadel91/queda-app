import React from 'react'
import { Link } from 'react-router-dom'
import { categoryIcon, categoryLabel } from '../constants/categories.js'
import { theme } from '../theme.js'

export default function PlanCard({ plan, count }) {
  const d = new Date(plan.date + 'T' + plan.time)
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <Link to={`/plan/${plan.id}`} style={{
      display: 'block', textDecoration: 'none', color: theme.text,
      background: theme.bgElev, border: `1px solid ${theme.border}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>
            {categoryIcon(plan.category)} {categoryLabel(plan.category)} · {dateStr} · {timeStr}
          </div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>
            📍 {plan.place_name}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: theme.accent, flexShrink: 0,
          background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: '4px 8px', textAlign: 'center', lineHeight: 1.3,
        }}>
          <div>{count ?? '?'}/{plan.capacity}</div>
        </div>
      </div>
    </Link>
  )
}
