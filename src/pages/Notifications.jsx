import React from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications.js'
import { theme as t } from '../theme.js'

const ICONS = {
  join: '🙋', request: '🙋', approved: '✅', rejected: '❌',
  cancelled: '🚫', reminder: '🔔', checkout_reminder: '⏰',
}

const fmtAgo = ts => {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Notifications() {
  const { items, unread, markAllRead } = useNotifications()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: 'none', color: t.accent, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
          }}>Mark all read</button>
        )}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔕</div>
          <p style={{ color: t.textDim, fontSize: 14 }}>Nothing yet.</p>
        </div>
      )}

      {items.map(n => (
        <Link
          key={n.id}
          to={n.plan_id ? `/plan/${n.plan_id}` : '#'}
          style={{
            display: 'flex', gap: 12, padding: '14px 0',
            borderBottom: `1px solid ${t.border}`,
            textDecoration: 'none', color: t.text,
            opacity: n.read ? 0.55 : 1,
          }}
        >
          <span style={{
            fontSize: 18, width: 36, height: 36, borderRadius: '50%',
            background: t.bgCard, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {ICONS[n.type] || '📌'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, lineHeight: 1.3 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 12, color: t.textDim, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>{fmtAgo(n.created_at)}</div>
          </div>
          {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, flexShrink: 0, marginTop: 8 }} />}
        </Link>
      ))}
    </div>
  )
}
