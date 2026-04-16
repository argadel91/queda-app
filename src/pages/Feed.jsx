import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { theme } from '../theme.js'

export default function Feed() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>queda</h1>
        <p style={{ color: theme.textDim, fontSize: 14, maxWidth: 320, margin: '0 auto 24px' }}>
          Spontaneous plans with real people. Beta.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <Link to="/signup" style={{
            background: theme.accent, color: theme.accentInk, textDecoration: 'none',
            padding: '13px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, letterSpacing: 0.5
          }}>
            Get started
          </Link>
          <Link to="/login" style={{
            background: 'transparent', color: theme.text, textDecoration: 'none',
            padding: '13px 16px', border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14
          }}>
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>Feed</h1>
      <p style={{ color: theme.textDim, fontSize: 14 }}>No plans yet. Create the first one.</p>
    </div>
  )
}
