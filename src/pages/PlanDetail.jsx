import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useTokens } from '../hooks/useTokens.js'
import { categoryIcon, categoryLabel } from '../constants/categories.js'
import { theme } from '../theme.js'

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
  const [attendance, setAttendance] = useState({}) // uid → boolean (checkout mode)

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

  const join = () => act(() => db.rpc('join_plan_with_deposit', { p_plan_id: id, p_user_id: user.id }))
  const leave = () => act(() => db.rpc('leave_plan', { p_plan_id: id, p_user_id: user.id }))
  const cancel = () => act(async () => {
    await db.rpc('cancel_plan', { p_plan_id: id, p_user_id: user.id })
    navigate('/', { replace: true })
  })
  const approve = uid => act(async () => {
    await db.from('plan_participants').update({ status: 'joined' }).eq('plan_id', id).eq('user_id', uid)
  })
  const reject = uid => act(() => db.rpc('reject_join_request', { p_organizer_id: user.id, p_plan_id: id, p_user_id: uid }))

  const finalise = () => act(async () => {
    // 1. Write each participant's attended flag
    for (const [uid, attended] of Object.entries(attendance)) {
      await db.from('plan_participants').update({ attended }).eq('plan_id', id).eq('user_id', uid)
    }
    // 2. Call checkout RPC (handles all token movements atomically)
    const { error } = await db.rpc('process_plan_checkout', { p_plan_id: id, p_organizer_id: user.id, p_auto: false })
    if (error) throw error
  })

  if (loading) return <p style={{ color: theme.textDim, padding: 24 }}>Loading…</p>
  if (!plan) return <p style={{ color: theme.textDim, padding: 24 }}>Plan not found.</p>

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
      <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
        {categoryIcon(plan.category)} {categoryLabel(plan.category)}
        {plan.status === 'cancelled' && <span style={{ color: theme.danger, marginLeft: 8 }}>CANCELLED</span>}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>{plan.title}</h1>
      {organizer && <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 20 }}>by {organizer.username || 'Anonymous'}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <Row label="When" value={`${dateStr} · ${timeStr}`} />
        <Row label="Where" value={plan.place_name} sub={plan.place_address} />
        <Row label="Spots" value={`${joined.length} / ${plan.capacity}${isFull ? ' · full' : ''}`} />
        <Row label="Join" value={plan.join_mode === 'approval' ? 'Needs approval' : plan.join_mode === 'private' ? 'Private' : 'Open'} />
        <Row label="Gender" value={plan.gender_filter === 'mixed' ? 'Mixed' : plan.gender_filter === 'male' ? 'Men only' : 'Women only'} />
        {plan.description && <Row label="Details" value={plan.description} />}
      </div>

      {err && <p style={{ color: theme.danger, fontSize: 13, marginBottom: 12 }}>{err}</p>}

      {/* --- Attendee actions --- */}
      {!isOrg && user && !isPast && (
        <>
          {!myStatus && !isFull && (
            <button disabled={busy || (balance !== null && balance < 1)} onClick={join} style={accentBtn}>
              {busy ? '…' : plan.join_mode === 'approval' ? 'Request to join · 1 token' : 'Join · 1 token'}
            </button>
          )}
          {!myStatus && isFull && (
            <p style={{ fontSize: 14, color: theme.textDim }}>Plan is full.</p>
          )}
          {myStatus === 'joined' && (
            <>
              <p style={{ fontSize: 14, color: theme.accent, fontWeight: 600, marginBottom: 8 }}>{"✓ You're in"}</p>
              <button disabled={busy} onClick={leave} style={dangerBtn}>
                {busy ? '…' : 'Leave plan'}
              </button>
            </>
          )}
          {myStatus === 'pending' && (
            <>
              <p style={{ fontSize: 14, color: theme.textDim, fontWeight: 600, marginBottom: 8 }}>⏳ Pending approval</p>
              <button disabled={busy} onClick={leave} style={dangerBtn}>
                {busy ? '…' : 'Withdraw request'}
              </button>
            </>
          )}
        </>
      )}

      {/* --- Checkout mode (organizer, plan time past, not yet checked out) --- */}
      {needsCheckout && joined.length > 0 && (
        <section style={{ marginBottom: 24, padding: '16px', background: theme.bgElev, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Check out — who showed up?</h3>
          {joined.map(p => (
            <label key={p.user_id} style={{
              ...participantRow, cursor: 'pointer', gap: 10,
            }}>
              <input
                type="checkbox"
                checked={attendance[p.user_id] ?? true}
                onChange={e => setAttendance(prev => ({ ...prev, [p.user_id]: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: theme.accent, flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 14, color: theme.text }}>{p.profiles?.username || 'User'}</span>
              <span style={{ fontSize: 12, color: (attendance[p.user_id] ?? true) ? theme.accent : theme.danger, fontWeight: 600 }}>
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
          <p style={{ color: theme.textDim, fontSize: 14, marginBottom: 12 }}>No one joined. You can finalise to close the plan.</p>
          <button disabled={busy} onClick={finalise} style={accentBtn}>
            {busy ? '…' : 'Finalise (no attendees)'}
          </button>
        </section>
      )}

      {/* --- Organizer actions (before plan time) --- */}
      {isOrg && !isPast && !needsCheckout && (
        <div style={{ marginBottom: 24 }}>
          <button disabled={busy} onClick={cancel} style={dangerBtn}>
            {busy ? '…' : 'Cancel plan'}
          </button>
        </div>
      )}

      {/* --- Checked-out banner --- */}
      {plan.checked_out_at && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: theme.bgElev, border: `1px solid ${theme.border}`, marginBottom: 20, fontSize: 13, color: theme.textDim }}>
          ✓ Checked out {plan.auto_checked_out ? '(auto — 48h)' : ''} · {new Date(plan.checked_out_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* --- Pending requests (organizer only) --- */}
      {isOrg && pending.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={sectionTitle}>Pending requests</h3>
          {pending.map(p => (
            <div key={p.user_id} style={participantRow}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={busy} onClick={() => approve(p.user_id)} style={smallGreen}>Accept</button>
                <button disabled={busy} onClick={() => reject(p.user_id)} style={smallRed}>Reject</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* --- Confirmed attendees --- */}
      {joined.length > 0 && !needsCheckout && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={sectionTitle}>Going ({joined.length})</h3>
          {joined.map(p => (
            <div key={p.user_id} style={participantRow}>
              <span style={{ fontSize: 14 }}>{p.profiles?.username || 'User'}</span>
              {p.user_id === plan.user_id && <span style={{ fontSize: 11, color: theme.accent }}>organiser</span>}
            </div>
          ))}
        </section>
      )}

      <Link to="/" style={{ display: 'block', marginTop: 16, color: theme.textDim, fontSize: 13, textDecoration: 'none' }}>← Feed</Link>
    </div>
  )
}

function Row({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
      <span style={{ width: 70, flexShrink: 0, color: theme.textDim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingTop: 2 }}>{label}</span>
      <div style={{ color: theme.text }}>
        <div>{value}</div>
        {sub && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

const accentBtn = {
  width: '100%', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
  fontFamily: theme.font, letterSpacing: 0.5, cursor: 'pointer',
  background: theme.accent, color: theme.accentInk, border: 'none',
}
const dangerBtn = {
  width: '100%', padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 13,
  fontFamily: theme.font, cursor: 'pointer',
  background: 'transparent', color: theme.danger, border: `1px solid ${theme.border}`,
}
const sectionTitle = { fontSize: 11, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }
const participantRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderBottom: `1px solid ${theme.border}`, color: theme.text,
}
const smallGreen = {
  padding: '6px 12px', borderRadius: 8, background: theme.accent, color: theme.accentInk,
  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font,
}
const smallRed = {
  padding: '6px 12px', borderRadius: 8, background: 'transparent', color: theme.danger,
  border: `1px solid ${theme.border}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
}
