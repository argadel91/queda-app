import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { CATEGORIES, categoryIcon, categoryLabel } from '../constants/categories.js'
import { AVATAR_COLORS } from '../components/Icons.jsx'
import { theme as t } from '../theme.js'

export default function Feed() {
  const { user, profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [counts, setCounts] = useState({})
  const [participants, setParticipants] = useState({})
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
        const { data: parts } = await db
          .from('plan_participants')
          .select('plan_id, user_id, profiles(username)')
          .in('plan_id', ids)
          .eq('status', 'joined')
        if (!cancelled && parts) {
          const c = {}, p = {}
          parts.forEach(pt => {
            c[pt.plan_id] = (c[pt.plan_id] || 0) + 1
            if (!p[pt.plan_id]) p[pt.plan_id] = []
            p[pt.plan_id].push(pt.profiles?.username || '?')
          })
          setCounts(c)
          setParticipants(p)
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

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const city = profile?.city || 'Your city'
  const hero = plans[0]
  const rest = plans.slice(1)

  return (
    <div>
      {/* Context line */}
      <div style={{
        fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
        color: t.textDim, fontWeight: 700, padding: '12px 0 18px',
      }}>
        {city} · {dateLabel}
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 20, WebkitOverflowScrolling: 'touch' }}>
        <Pill active={!catFilter} onClick={() => setCatFilter('')}>All</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.value} active={catFilter === c.value} onClick={() => setCatFilter(catFilter === c.value ? '' : c.value)}>
            {c.icon} {c.label}
          </Pill>
        ))}
      </div>

      {loading && <p style={{ color: t.textDim, fontSize: 13, padding: '20px 0' }}>Loading…</p>}

      {/* Empty state */}
      {!loading && plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
          <p style={{ color: t.textDim, fontSize: 15, marginBottom: 20 }}>Nothing happening yet.</p>
          <Link to="/create-plan" style={{
            fontFamily: t.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.6,
            color: t.text, textDecoration: 'none',
          }}>
            Create a plan <span style={{ color: t.accent }}>→</span>
          </Link>
        </div>
      )}

      {/* Hero card */}
      {hero && <HeroCard plan={hero} count={counts[hero.id] || 0} names={participants[hero.id] || []} />}

      {/* Rest */}
      {rest.length > 0 && (
        <>
          <div style={{
            fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
            color: t.textDim, fontWeight: 700, margin: '32px 0 16px',
          }}>
            Coming up · {rest.length}
          </div>
          {rest.map((p, i) => <PlanRow key={p.id} plan={p} count={counts[p.id] || 0} first={i === 0} />)}
        </>
      )}
    </div>
  )
}

function timeUntil(plan) {
  const planDate = new Date(plan.date + 'T' + plan.time)
  const diffH = Math.round((planDate - new Date()) / 3600000)
  if (diffH < 0) return 'Now'
  if (diffH < 1) return 'In < 1 hour'
  if (diffH < 24) return `In ${diffH} hour${diffH === 1 ? '' : 's'}`
  const diffD = Math.round(diffH / 24)
  if (diffD === 1) return 'Tomorrow'
  return `In ${diffD} days`
}

function HeroCard({ plan, count, names }) {
  const d = new Date(plan.date + 'T' + plan.time)
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const priv = plan.join_mode === 'private'

  return (
    <Link to={`/plan/${plan.id}`} style={{
      display: 'block', textDecoration: 'none', color: t.text,
      background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: t.radius,
      padding: '22px 20px', marginBottom: 8,
    }}>
      {/* Top row: time indicator + spots */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          fontWeight: 700, color: t.accent,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 999, background: t.accent,
            boxShadow: '0 0 12px rgba(205,255,108,1)',
          }}/>
          {timeUntil(plan)}
        </div>
        <span style={{ fontSize: 13, color: t.textDim, fontWeight: 600 }}>{count}/{plan.capacity}</span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: t.fontHead, fontSize: 32, fontWeight: 800,
        letterSpacing: -1.2, lineHeight: 1.3, color: t.text, marginBottom: 14,
      }}>{plan.title}</div>

      {/* Time + place */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: t.textDim, fontWeight: 700, marginBottom: 4 }}>When</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{timeStr}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: t.textDim, fontWeight: 700, marginBottom: 4 }}>Where</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{priv ? 'Hidden' : plan.place_name}</div>
        </div>
      </div>

      {/* Avatar stack + join pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {names.slice(0, 4).map((name, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 999,
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                border: `2px solid ${t.bg}`,
                marginLeft: i === 0 ? 0 : -8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: t.accentInk,
              }}>{(name[0] || '?').toUpperCase()}</div>
            ))}
          </div>
          {names.length > 4 && (
            <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>+{names.length - 4}</span>
          )}
        </div>
        <span style={{
          padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 800,
          background: t.accent, color: t.accentInk,
          fontFamily: t.fontHead, letterSpacing: -0.3,
        }}>Join →</span>
      </div>
    </Link>
  )
}

function PlanRow({ plan, count, first }) {
  const d = new Date(plan.date + 'T' + plan.time)
  const dayStr = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const priv = plan.join_mode === 'private'

  return (
    <Link to={`/plan/${plan.id}`} style={{
      display: 'flex', width: '100%', textDecoration: 'none', color: t.text,
      borderTop: first ? `1px solid ${t.border}` : 'none',
      borderBottom: `1px solid ${t.border}`,
      padding: '18px 0', gap: 18, alignItems: 'center',
    }}>
      <div style={{ flexShrink: 0, width: 48 }}>
        <div style={{
          fontFamily: t.fontHead, fontSize: 11, fontWeight: 800,
          letterSpacing: 1.5, textTransform: 'uppercase', color: t.accent,
        }}>{dayStr}</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: t.text }}>{timeStr}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: t.fontHead, fontSize: 20, fontWeight: 800,
          letterSpacing: -0.8, color: t.text, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 4,
        }}>{plan.title}</div>
        <div style={{ fontSize: 12, color: t.textDim, fontWeight: 600, letterSpacing: 0.3 }}>
          {priv ? 'Private' : plan.place_name} · {count}/{plan.capacity}
        </div>
      </div>
    </Link>
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
