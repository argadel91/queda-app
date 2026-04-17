import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useTokens } from '../hooks/useTokens.js'
import { categoryIcon, categoryLabel } from '../constants/categories.js'
import { theme as t } from '../theme.js'

export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balance } = useTokens()
  const [plan, setPlan] = useState(null)
  const [organizer, setOrganizer] = useState(null)
  const [joined, setJoined] = useState([])
  const [pending, setPending] = useState([])
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [attendance, setAttendance] = useState({})

  const load = useCallback(async () => {
    const { data: p } = await db.from('plans').select('*').eq('id', id).maybeSingle()
    if (!p) { setLoading(false); return }
    setPlan(p)
    const [{ data: org }, { data: parts }] = await Promise.all([
      db.from('profiles').select('id, username, gender, birthdate').eq('id', p.user_id).maybeSingle(),
      db.from('plan_participants').select('user_id, status, profiles(username, gender)').eq('plan_id', id).in('status', ['joined', 'pending']),
    ])
    setOrganizer(org)
    const j = (parts || []).filter(x => x.status === 'joined')
    setJoined(j)
    setPending((parts || []).filter(x => x.status === 'pending'))
    setMyStatus((parts || []).find(x => x.user_id === user?.id)?.status || null)
    setAttendance(prev => {
      const next = {}
      j.forEach(x => { next[x.user_id] = prev[x.user_id] ?? true })
      return next
    })
    setLoading(false)
  }, [id, user?.id])

  useEffect(() => { load() }, [load])

  const act = async (fn) => {
    setBusy(true); setErr('')
    try { await fn(); await load() }
    catch (e) { setErr(e.message || String(e)) }
    setBusy(false)
  }

  const rpc = async (fn, params) => {
    const { error } = await db.rpc(fn, params)
    if (error) throw new Error(error.message)
  }
  const join = () => act(() => rpc('join_plan_with_deposit', { p_plan_id: id, p_user_id: user.id }))
  const leave = () => act(() => rpc('leave_plan', { p_plan_id: id, p_user_id: user.id }))
  const cancel = () => act(async () => {
    await rpc('cancel_plan', { p_plan_id: id, p_user_id: user.id })
    navigate('/', { replace: true })
  })
  const approve = uid => act(async () => {
    const { error } = await db.from('plan_participants').update({ status: 'joined' }).eq('plan_id', id).eq('user_id', uid)
    if (error) throw new Error(error.message)
  })
  const reject = uid => act(() => rpc('reject_join_request', { p_organizer_id: user.id, p_plan_id: id, p_user_id: uid }))
  const finalise = () => act(async () => {
    for (const [uid, attended] of Object.entries(attendance)) {
      await db.from('plan_participants').update({ attended }).eq('plan_id', id).eq('user_id', uid)
    }
    const { error } = await db.rpc('process_plan_checkout', { p_plan_id: id, p_organizer_id: user.id, p_auto: false })
    if (error) throw error
  })

  if (loading) return <p style={{ color: t.textDim, padding: 24 }}>Loading…</p>
  if (!plan) return <p style={{ color: t.textDim, padding: 24 }}>Plan not found.</p>

  const d = new Date(plan.date + 'T' + plan.time)
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const isOrg = user?.id === plan.user_id
  const isFull = joined.length >= plan.capacity
  const isPast = plan.status === 'past' || plan.status === 'cancelled'
  const planTs = new Date(plan.date + 'T' + plan.time)
  const needsCheckout = isOrg && planTs < new Date() && !plan.checked_out_at && plan.status !== 'cancelled'

  return (
    <div>
      <div style={{ fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
        {categoryIcon(plan.category)} {categoryLabel(plan.category)}
        {plan.status === 'cancelled' && <span style={{ color: t.danger, marginLeft: 8 }}>CANCELLED</span>}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{plan.title}</h1>
      {organizer && <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20 }}>by {organizer.username || 'Anonymous'}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, padding: '16px 18px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <Row icon="📅" value={`${dateStr} · ${timeStr}`} />
        <Row icon="📍" value={plan.place_name} sub={plan.place_address} />
        <Row icon="👥" value={`${joined.length} / ${plan.capacity}${isFull ? ' · full' : ''}`} />
        <Row icon="🔓" value={plan.join_mode === 'approval' ? 'Needs approval' : plan.join_mode === 'private' ? 'Private' : 'Open'} />
        <Row icon="⚥" value={plan.gender_filter === 'mixed' ? 'Mixed' : plan.gender_filter === 'male' ? 'Men only' : 'Women only'} />
        {plan.description && <Row icon="📝" value={plan.description} />}
      </div>

      {err && <p style={{ color: t.danger, fontSize: 13, marginBottom: 12 }}>{err}</p>}

      {/* Checkout */}
      {needsCheckout && joined.length > 0 && (
        <section style={{ marginBottom: 24, padding: '18px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radius }}>
          <h3 style={secTitle}>Check out — who showed up?</h3>
          {joined.map(p => (
            <label key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}>
              <input type="checkbox" checked={attendance[p.user_id] ?? true}
                onChange={e => setAttendance(prev => ({ ...prev, [p.user_id]: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: t.accent, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: (attendance[p.user_id] ?? true) ? t.accent : t.danger }}>
                {(attendance[p.user_id] ?? true) ? '✓ attended' : '✗ no-show'}
              </span>
            </label>
          ))}
          <button disabled={busy} onClick={finalise} style={{ ...accentBtn, marginTop: 16 }}>
            {busy ? 'Processing…' : 'Finalise plan'}
          </button>
        </section>
      )}
      {needsCheckout && joined.length === 0 && (
        <section style={{ marginBottom: 24 }}>
          <p style={{ color: t.textDim, fontSize: 14, marginBottom: 12 }}>No one joined.</p>
          <button disabled={busy} onClick={finalise} style={accentBtn}>{busy ? '…' : 'Finalise (no attendees)'}</button>
        </section>
      )}

      {/* Attendee actions */}
      {!isOrg && user && !isPast && !needsCheckout && (
        <div style={{ marginBottom: 20 }}>
          {!myStatus && !isFull && (
            <button disabled={busy || (balance !== null && balance < 1)} onClick={join} style={accentBtn}>
              {busy ? '…' : plan.join_mode === 'approval' ? 'Request to join · 1 token' : 'Join · 1 token'}
            </button>
          )}
          {!myStatus && isFull && <p style={{ fontSize: 14, color: t.textDim }}>Plan is full.</p>}
          {myStatus === 'joined' && (
            <>
              <p style={{ fontSize: 14, color: t.accent, fontWeight: 600, marginBottom: 8 }}>{"✓ You're in"}</p>
              <button disabled={busy} onClick={leave} style={dangerBtn}>{busy ? '…' : 'Leave plan'}</button>
            </>
          )}
          {myStatus === 'pending' && (
            <>
              <p style={{ fontSize: 14, color: t.textDim, fontWeight: 600, marginBottom: 8 }}>⏳ Pending approval</p>
              <button disabled={busy} onClick={leave} style={dangerBtn}>{busy ? '…' : 'Withdraw request'}</button>
            </>
          )}
        </div>
      )}

      {/* Organizer cancel (before plan time) */}
      {isOrg && !isPast && !needsCheckout && (
        <div style={{ marginBottom: 24 }}>
          <button disabled={busy} onClick={cancel} style={dangerBtn}>{busy ? '…' : 'Cancel plan'}</button>
        </div>
      )}

      {/* Checked-out banner */}
      {plan.checked_out_at && (
        <div style={{ padding: '12px 16px', borderRadius: t.radiusSm, background: t.accentSoft, marginBottom: 20, fontSize: 13, color: t.accent, fontWeight: 600 }}>
          ✓ Checked out {plan.auto_checked_out ? '(auto — 48h)' : ''} · {new Date(plan.checked_out_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* Pending requests */}
      {isOrg && pending.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={secTitle}>Pending requests</h3>
          {pending.map(p => (
            <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={busy} onClick={() => approve(p.user_id)} style={smallGreen}>Accept</button>
                <button disabled={busy} onClick={() => reject(p.user_id)} style={smallRed}>Reject</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Attendees list */}
      {joined.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={secTitle}>Going ({joined.length})</h3>
          {joined.map(p => (
            <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              {p.user_id === plan.user_id && <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>organiser</span>}
            </div>
          ))}
        </section>
      )}

      <Link to="/" style={{ display: 'block', marginTop: 16, color: t.textDim, fontSize: 13, textDecoration: 'none' }}>← Feed</Link>
    </div>
  )
}

function Row({ icon, value, sub }) {
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
const secTitle = { fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }
const smallGreen = {
  padding: '6px 14px', borderRadius: 8, background: t.gradient, color: t.accentInk,
  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: t.font,
}
const smallRed = {
  padding: '6px 14px', borderRadius: 8, background: t.dangerSoft, color: t.danger,
  border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
}
