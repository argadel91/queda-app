import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useTokens } from '../hooks/useTokens.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { theme as t } from '../theme.js'

export default function Layout({ children }) {
  const { user } = useAuth()
  const { balance } = useTokens()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const tokens = user ? (balance ?? '—') : '—'

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(16px) saturate(1.5)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 0,
          fontFamily: t.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
        }}>
          queda<span style={{ color: t.accent }}>.</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => navigate('/notifications')} style={{
            position: 'relative', background: 'none', border: 'none', color: t.textDim,
            fontSize: 18, cursor: 'pointer', padding: '6px',
          }}>
            🔔
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 999,
                background: t.danger, color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
          <button onClick={() => navigate('/wallet')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: t.accentSoft, border: 'none', borderRadius: 999,
            padding: '6px 12px', cursor: 'pointer', fontFamily: t.font,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>{tokens}</span>
            <span style={{ fontSize: 11, color: t.textDim }}>tkn</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{
        flex: 1, padding: '20px 16px',
        paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
        maxWidth: 480, margin: '0 auto', width: '100%',
      }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'rgba(6,6,8,0.92)', backdropFilter: 'blur(16px) saturate(1.5)',
        borderTop: `1px solid ${t.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <NavItem to="/" icon="◉" label="Feed" />
        <NavItem to="/create-plan" icon="＋" label="Create" />
        <NavItem to="/my-plans" icon="▤" label="Mine" />
        <NavItem to="/profile" icon="○" label="Profile" />
      </nav>
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '10px 0 8px', textDecoration: 'none', gap: 2,
      color: isActive ? t.accent : t.textDim,
      fontFamily: t.font, fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
      transition: 'color 150ms ease',
    })}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
