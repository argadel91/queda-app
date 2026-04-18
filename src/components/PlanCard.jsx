import React from 'react'
import { Link } from 'react-router-dom'
import { categoryIcon, categoryLabel } from '../constants/categories.js'
import { theme as t } from '../theme.js'

export default function PlanCard({ plan, count }) {
  const d = new Date(plan.date + 'T' + plan.time)
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const spotsLeft = plan.capacity - (count || 0)
  const almostFull = spotsLeft <= 2 && spotsLeft > 0
  const priv = plan.join_mode === 'private'

  return (
    <Link to={`/plan/${plan.id}`} style={{
      display: 'block', textDecoration: 'none', color: t.text,
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radius,
      padding: '16px 18px', marginBottom: 12,
      transition: 'border-color 150ms ease, transform 150ms ease',
    }}>
      {/* Category + time row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
          color: t.textDim,
        }}>
          {categoryIcon(plan.category)} {categoryLabel(plan.category)}
        </span>
        <span style={{ fontSize: 11, color: t.textDim }}>
          {dateStr} · {timeStr}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: t.fontHead, fontSize: 17, fontWeight: 800,
        letterSpacing: -0.8, lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 4,
      }}>
        {plan.title}
      </div>

      {/* Place */}
      <div style={{ fontSize: 13, color: t.textDim, marginBottom: 12 }}>
        {priv ? '🔒 Location hidden' : `📍 ${plan.place_name}`}
      </div>

      {/* Footer: spots + gender */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: almostFull ? t.danger : t.accent,
          background: almostFull ? t.dangerSoft : t.accentSoft,
          padding: '3px 10px', borderRadius: 999,
        }}>
          {count || 0}/{plan.capacity} {almostFull ? '· almost full' : ''}
        </span>
        {plan.gender_filter !== 'mixed' && (
          <span style={{
            fontSize: 11, color: t.textDim,
            background: t.bgElev, padding: '3px 8px', borderRadius: 999,
          }}>
            {plan.gender_filter === 'male' ? '♂ men' : '♀ women'}
          </span>
        )}
        {plan.join_mode === 'approval' && (
          <span style={{ fontSize: 11, color: t.textDim, background: t.bgElev, padding: '3px 8px', borderRadius: 999 }}>
            approval
          </span>
        )}
        {priv && (
          <span style={{ fontSize: 11, color: t.textDim, background: t.bgElev, padding: '3px 8px', borderRadius: 999 }}>
            🔒 private
          </span>
        )}
      </div>
    </Link>
  )
}
