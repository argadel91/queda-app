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

function TrashIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function Notifications() {
  const { items, unread, markAllRead, deleteOne, clearAll } = useNotifications()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Notifications</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{ background: 'none', border: 'none', color: t.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font }}
            >
              Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{ background: 'none', border: 'none', color: t.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔕</div>
          <p style={{ color: t.textDim, fontSize: 14 }}>Nothing yet.</p>
        </div>
      )}

      {items.map(n => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 0',
            borderBottom: `1px solid ${t.border}`,
            alignItems: 'flex-start',
          }}
        >
          <Link
            to={n.plan_id ? `/plan/${n.plan_id}` : '#'}
            style={{
              display: 'flex', gap: 12, flex: 1, minWidth: 0,
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

          <button
            type="button"
            onClick={() => deleteOne(n.id)}
            aria-label="Delete notification"
            style={{
              background: 'none', border: 'none', color: t.textDim, cursor: 'pointer',
              padding: '4px 6px', borderRadius: 6, flexShrink: 0, marginTop: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = t.danger }}
            onMouseLeave={e => { e.currentTarget.style.color = t.textDim }}
          >
            <TrashIcon />
          </button>
        </div>
      ))}
    </div>
  )
}
