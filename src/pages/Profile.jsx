import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { theme } from '../theme.js'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>Profile</h1>
      <div style={{ color: theme.textDim, fontSize: 13, lineHeight: 1.8 }}>
        <div><span style={{ color: theme.text }}>{profile?.username || '—'}</span></div>
        <div>{user?.email}</div>
        <div>Gender: {profile?.gender || '—'}</div>
      </div>

      <Link to="/wallet" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 20, padding: '14px 16px', borderRadius: 12,
        background: theme.bgElev, border: `1px solid ${theme.border}`,
        textDecoration: 'none', color: theme.text, fontSize: 14, fontWeight: 600
      }}>
        <span>Wallet</span>
        <span style={{ color: theme.accent }}>{profile?.token_balance ?? '—'} tokens →</span>
      </Link>

      <button onClick={signOut} style={{
        marginTop: 24, background: 'transparent', color: theme.danger, border: `1px solid ${theme.border}`,
        padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font
      }}>Sign out</button>
    </div>
  )
}
