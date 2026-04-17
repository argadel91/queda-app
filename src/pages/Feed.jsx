import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { CATEGORIES } from '../constants/categories.js'
import PlanCard from '../components/PlanCard.jsx'
import { theme } from '../theme.js'

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
      // Gender filter: show plans matching user's gender or mixed
      if (profile?.gender === 'male') q = q.in('gender_filter', ['mixed', 'male'])
      else if (profile?.gender === 'female') q = q.in('gender_filter', ['mixed', 'female'])

      const { data, error } = await q
      if (cancelled || error) { setLoading(false); return }
      setPlans(data || [])

      // Fetch participant counts in batch
      if (data?.length) {
        const ids = data.map(p => p.id)
        const { data: parts } = await db
          .from('plan_participants')
          .select('plan_id')
          .in('plan_id', ids)
          .eq('status', 'joined')
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

  // Landing for logged-out users
  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>queda</h1>
        <p style={{ color: theme.textDim, fontSize: 14, maxWidth: 320, margin: '0 auto 24px' }}>
          Spontaneous plans with real people. Beta.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <Link to="/signup" style={{
            display: 'block', background: theme.accent, color: theme.accentInk, textDecoration: 'none', textAlign: 'center',
            padding: '13px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          }}>Get started</Link>
          <Link to="/login" style={{
            display: 'block', background: 'transparent', color: theme.text, textDecoration: 'none', textAlign: 'center',
            padding: '13px 16px', border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14,
          }}>Log in</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>Feed</h1>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
        <Pill active={!catFilter} onClick={() => setCatFilter('')}>All</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.value} active={catFilter === c.value} onClick={() => setCatFilter(catFilter === c.value ? '' : c.value)}>
            {c.icon} {c.label}
          </Pill>
        ))}
      </div>

      {loading && <p style={{ color: theme.textDim, fontSize: 13 }}>Loading…</p>}
      {!loading && plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: theme.textDim, fontSize: 14, marginBottom: 16 }}>No plans yet.</p>
          <Link to="/create-plan" style={{ color: theme.accent, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Create the first one →</Link>
        </div>
      )}
      {plans.map(p => <PlanCard key={p.id} plan={p} count={counts[p.id] || 0} />)}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 12px', borderRadius: 999, border: `1px solid ${active ? theme.accent : theme.border}`,
      background: active ? theme.accent : 'transparent', color: active ? theme.accentInk : theme.textDim,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: theme.font,
    }}>{children}</button>
  )
}
