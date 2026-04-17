import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useTokens } from '../hooks/useTokens.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { theme } from '../theme.js'

export default function Layout({ children }) {
  const { user } = useAuth()
  const { balance } = useTokens()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const tokens = user ? (balance ?? '—') : '—'

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: theme.bg, borderBottom: `1px solid ${theme.border}`
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'none', border: 'none', color: theme.text, fontSize: 20, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: theme.font
        }}>
          queda
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => navigate('/notifications')} style={{
          position: 'relative', background: 'none', border: 'none', color: theme.text,
          fontSize: 18, cursor: 'pointer', padding: 4,
        }}>
          🔔
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 999,
              background: theme.danger, color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
        <button onClick={() => navigate('/wallet')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: theme.bgElev, border: `1px solid ${theme.border}`, borderRadius: 999,
          padding: '6px 12px', fontSize: 13, color: theme.accent, fontWeight: 600,
          cursor: 'pointer', fontFamily: theme.font
        }}>
          {tokens} <span style={{ color: theme.textDim, fontWeight: 400 }}>tokens</span>
        </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom,0px))', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: theme.bgElev, borderTop: `1px solid ${theme.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
        <NavItem to="/" label="Feed" icon="◉" />
        <NavItem to="/create-plan" label="Create" icon="+" />
        <NavItem to="/my-plans" label="Mine" icon="▤" />
        <NavItem to="/profile" label="Profile" icon="○" />
      </nav>
    </div>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '10px 0', textDecoration: 'none',
      color: isActive ? theme.accent : theme.textDim,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.5, fontFamily: theme.font,
      gap: 2
    })}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
