import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { CATEGORIES } from '../constants/categories.js'
import PlanCard from '../components/PlanCard.jsx'
import { theme as t } from '../theme.js'

export default function Feed() {
  const { user, profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [counts, setCounts] = useState({})
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    const load = async () => {
      let q = db.from('plans').select('*')
        .in('status', ['active', 'full'])
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(50)
      if (catFilter) q = q.eq('category', catFilter)
      if (profile?.gender === 'male') q = q.in('gender_filter', ['mixed', 'male'])
      else if (profile?.gender === 'female') q = q.in('gender_filter', ['mixed', 'female'])

      const { data, error } = await q
      if (cancelled || error) { setLoading(false); return }
      setPlans(data || [])
      if (data?.length) {
        const ids = data.map(p => p.id)
        const { data: parts } = await db.from('plan_participants').select('plan_id').in('plan_id', ids).eq('status', 'joined')
        if (!cancelled && parts) {
          const c = {}
          parts.forEach(p => { c[p.plan_id] = (c[p.plan_id] || 0) + 1 })
          setCounts(c)
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, profile?.gender, catFilter])

  // Landing
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <h1 style={{ fontFamily: t.fontHead, fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 4, lineHeight: 1.1 }}>
          queda<span style={{ color: t.accent }}>.</span>
        </h1>
        <p style={{ color: t.textDim, fontSize: 15, maxWidth: 300, margin: '12px auto 32px', lineHeight: 1.5 }}>
          Spontaneous plans with real people. Get off the couch.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <Link to="/signup" style={{
            display: 'block', background: t.gradient, color: t.accentInk, textDecoration: 'none', textAlign: 'center',
            padding: '14px 16px', borderRadius: t.radiusSm, fontWeight: 700, fontSize: 15, letterSpacing: 0.3,
          }}>Get started</Link>
          <Link to="/login" style={{
            display: 'block', background: 'transparent', color: t.text, textDecoration: 'none', textAlign: 'center',
            padding: '14px 16px', border: `1px solid ${t.border}`, borderRadius: t.radiusSm, fontWeight: 600, fontSize: 14,
          }}>Log in</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 16px' }}>
        What's on
      </h1>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14, marginBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        <Pill active={!catFilter} onClick={() => setCatFilter('')}>All</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.value} active={catFilter === c.value} onClick={() => setCatFilter(catFilter === c.value ? '' : c.value)}>
            {c.icon} {c.label}
          </Pill>
        ))}
      </div>

      {loading && <p style={{ color: t.textDim, fontSize: 13, padding: '20px 0' }}>Loading…</p>}
      {!loading && plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
          <p style={{ color: t.textDim, fontSize: 15, marginBottom: 16 }}>Nothing happening yet.</p>
          <Link to="/create-plan" style={{
            display: 'inline-block', background: t.gradient, color: t.accentInk,
            padding: '12px 24px', borderRadius: t.radiusSm, fontWeight: 700, fontSize: 14,
            textDecoration: 'none', letterSpacing: 0.3,
          }}>Create the first plan →</Link>
        </div>
      )}
      {plans.map(p => <PlanCard key={p.id} plan={p} count={counts[p.id] || 0} />)}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 999,
      border: active ? 'none' : `1px solid ${t.border}`,
      background: active ? t.gradient : 'transparent',
      color: active ? t.accentInk : t.textDim,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: t.font, transition: 'all 150ms ease',
    }}>{children}</button>
  )
}
