import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useTrust } from '../hooks/useTrust.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { formatTrust } from '../lib/trust.js'
import { IconCompass, IconPlus, IconCalendar, IconBell } from './Icons.jsx'
import { theme as t } from '../theme.js'

export default function Layout({ children }) {
  const { user, profile } = useAuth()
  const { trust } = useTrust()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const initial = (profile?.username || user?.email || '?')[0].toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'rgba(6,6,8,0.85)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <button onClick={() => navigate('/profile')} style={{
              width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: t.gradient, color: t.accentInk,
              fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font, flexShrink: 0,
            }}>{initial}</button>
          )}
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 0,
            fontFamily: t.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
          }}>
            queda<span style={{ color: t.accent }}>.</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/notifications')} aria-label="Notifications" style={{
            position: 'relative', background: 'transparent',
            border: `1px solid ${t.border}`, borderRadius: 999,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.text, cursor: 'pointer', padding: 0,
          }}>
            <IconBell />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                background: t.danger, color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${t.bg}`,
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
          <button onClick={() => navigate('/profile')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: t.accentSoft, border: 'none', borderRadius: 999,
            padding: '7px 14px', cursor: 'pointer', fontFamily: t.font,
            height: 36,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: trust < 0 ? t.textDim : t.accent, lineHeight: 1 }}>
              {formatTrust(trust)}
            </span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{
        flex: 1, padding: '20px 18px',
        paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
        maxWidth: 480, margin: '0 auto', width: '100%',
      }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Bottom nav — 3 tabs */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'rgba(6,6,8,0.92)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        borderTop: `1px solid ${t.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <NavItem to="/" icon={<IconCompass />} label="Discover" />
        <NavItem to="/create-plan" icon={<IconPlus />} label="Create" cta />
        <NavItem to="/my-plans" icon={<IconCalendar />} label="My Plans" />
      </nav>
    </div>
  )
}

function NavItem({ to, icon, label, cta }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 4, padding: '12px 0 10px', textDecoration: 'none', cursor: 'pointer',
      color: isActive ? t.accent : t.textDim,
      fontFamily: t.font, fontSize: 10, fontWeight: 600, letterSpacing: 0.6,
      transition: 'color 150ms ease',
    })}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: cta ? 44 : 28, height: 28,
        borderRadius: cta ? 10 : 0,
        background: cta ? t.gradient : 'transparent',
        color: cta ? t.accentInk : undefined,
      }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
