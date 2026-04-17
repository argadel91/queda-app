import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { categoryIcon, categoryLabel } from '../constants/categories.js'
import { theme } from '../theme.js'

export default function PlanDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [organizer, setOrganizer] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: p } = await db.from('plans').select('*').eq('id', id).maybeSingle()
      if (cancelled || !p) { setLoading(false); return }
      setPlan(p)
      const [{ data: org }, { data: parts }] = await Promise.all([
        db.from('profiles').select('id, username, gender').eq('id', p.user_id).maybeSingle(),
        db.from('plan_participants').select('user_id, status').eq('plan_id', id).eq('status', 'joined'),
      ])
      if (cancelled) return
      setOrganizer(org)
      setParticipants(parts || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <p style={{ color: theme.textDim, padding: 24 }}>Loading…</p>
  if (!plan) return <p style={{ color: theme.textDim, padding: 24 }}>Plan not found.</p>

  const d = new Date(plan.date + 'T' + plan.time)
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const isOrganizer = user?.id === plan.user_id
  const isJoined = participants.some(p => p.user_id === user?.id)
  const isFull = participants.length >= plan.capacity

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          {categoryIcon(plan.category)} {categoryLabel(plan.category)}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>{plan.title}</h1>
        {organizer && (
          <div style={{ fontSize: 13, color: theme.textDim }}>by {organizer.username || 'Anonymous'}</div>
        )}
      </div>

      {/* Details rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <Row label="When" value={`${dateStr} · ${timeStr}`} />
        <Row label="Where" value={plan.place_name} sub={plan.place_address} />
        <Row label="Spots" value={`${participants.length} / ${plan.capacity}${isFull ? ' (full)' : ''}`} />
        <Row label="Join mode" value={plan.join_mode === 'approval' ? 'Needs approval' : plan.join_mode === 'private' ? 'Private (link only)' : 'Open'} />
        <Row label="Gender" value={plan.gender_filter === 'mixed' ? 'Mixed' : plan.gender_filter === 'male' ? 'Men only' : 'Women only'} />
        {plan.description && <Row label="Details" value={plan.description} />}
      </div>

      {/* Action button — joining logic comes in Prompt 6 */}
      {!isOrganizer && user && !isJoined && !isFull && plan.status === 'active' && (
        <button disabled style={{
          width: '100%', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          fontFamily: theme.font, letterSpacing: 0.5, cursor: 'default',
          background: theme.accent, color: theme.accentInk, border: 'none', opacity: 0.5,
        }}>Join — 1 token (coming soon)</button>
      )}
      {isJoined && <p style={{ fontSize: 14, color: theme.accent, fontWeight: 600 }}>✓ You're in</p>}
      {isOrganizer && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled style={{ flex: 1, padding: '12px', borderRadius: 10, background: theme.bgElev, border: `1px solid ${theme.border}`, color: theme.textDim, fontSize: 13, fontWeight: 600, fontFamily: theme.font }}>Cancel plan</button>
          <button disabled style={{ flex: 1, padding: '12px', borderRadius: 10, background: theme.bgElev, border: `1px solid ${theme.border}`, color: theme.textDim, fontSize: 13, fontWeight: 600, fontFamily: theme.font }}>Check out</button>
        </div>
      )}

      <Link to="/" style={{ display: 'block', marginTop: 24, color: theme.textDim, fontSize: 13, textDecoration: 'none' }}>← Back to feed</Link>
    </div>
  )
}

function Row({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
      <span style={{ width: 80, flexShrink: 0, color: theme.textDim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingTop: 2 }}>{label}</span>
      <div style={{ color: theme.text }}>
        <div>{value}</div>
        {sub && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}
