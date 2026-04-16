import React from 'react'
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
        <div>Tokens: {profile?.token_balance ?? '—'}</div>
      </div>
      <button onClick={signOut} style={{
        marginTop: 24, background: 'transparent', color: theme.danger, border: `1px solid ${theme.border}`,
        padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font
      }}>Sign out</button>
    </div>
  )
}
