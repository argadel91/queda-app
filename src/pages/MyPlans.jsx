import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import PlanCard from '../components/PlanCard.jsx'
import { theme } from '../theme.js'

export default function MyPlans() {
  const { user } = useAuth()
  const [created, setCreated] = useState([])
  const [joined, setJoined] = useState([])
  const [counts, setCounts] = useState({})
  const [tab, setTab] = useState('created')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      const [{ data: c }, { data: j }] = await Promise.all([
        db.from('plans').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
        db.from('plan_participants').select('plan_id, plans(*)').eq('user_id', user.id).eq('status', 'joined').limit(30),
      ])
      if (cancelled) return
      setCreated(c || [])
      const jPlans = (j || []).map(r => r.plans).filter(Boolean)
      setJoined(jPlans)
      // Batch counts
      const allIds = [...(c || []).map(p => p.id), ...jPlans.map(p => p.id)]
      if (allIds.length) {
        const { data: parts } = await db.from('plan_participants').select('plan_id').in('plan_id', allIds).eq('status', 'joined')
        if (!cancelled && parts) {
          const m = {}
          parts.forEach(p => { m[p.plan_id] = (m[p.plan_id] || 0) + 1 })
          setCounts(m)
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const list = tab === 'created' ? created : joined

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>My plans</h1>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
        {['created', 'joined'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: theme.font,
            fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
            background: tab === t ? theme.accent : theme.bgElev,
            color: tab === t ? theme.accentInk : theme.textDim,
          }}>{t === 'created' ? 'Created' : 'Joined'}</button>
        ))}
      </div>

      {loading && <p style={{ color: theme.textDim, fontSize: 13 }}>Loading…</p>}

      {!loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: theme.textDim, fontSize: 14, marginBottom: 16 }}>
            {tab === 'created' ? 'You haven't created any plans yet.' : 'You haven't joined any plans yet.'}
          </p>
          <Link to={tab === 'created' ? '/create-plan' : '/'} style={{ color: theme.accent, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            {tab === 'created' ? 'Create one →' : 'Browse the feed →'}
          </Link>
        </div>
      )}

      {list.map(p => <PlanCard key={p.id} plan={p} count={counts[p.id] || 0} />)}
    </div>
  )
}
