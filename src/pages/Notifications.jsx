import React from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications.js'
import { theme } from '../theme.js'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: 'none', color: theme.accent, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
          }}>Mark all read</button>
        )}
      </div>

      {items.length === 0 && (
        <p style={{ color: theme.textDim, fontSize: 14, padding: '24px 0' }}>Nothing yet.</p>
      )}

      {items.map(n => (
        <Link
          key={n.id}
          to={n.plan_id ? `/plan/${n.plan_id}` : '#'}
          style={{
            display: 'flex', gap: 12, padding: '12px 0',
            borderBottom: `1px solid ${theme.border}`,
            textDecoration: 'none', color: theme.text,
            opacity: n.read ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>
            {ICONS[n.type] || '📌'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>{fmtAgo(n.created_at)}</div>
          </div>
          {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent, flexShrink: 0, marginTop: 6 }} />}
        </Link>
      ))}
    </div>
  )
}
