import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { theme as t } from '../theme.js'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const onSubmit = async e => {
    e.preventDefault()
    setErr(''); setNotice(''); setLoading(true)
    const { data, error } = await db.auth.signUp({ email: email.trim(), password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    if (data.session) {
      navigate('/onboarding', { replace: true })
    } else {
      setNotice('Check your inbox to confirm your email, then log in.')
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
        queda<span style={{ color: t.accent }}>.</span>
      </h1>
      <p style={{ color: t.textDim, fontSize: 14, marginBottom: 28 }}>Create your account</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Email">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inp} />
        </Field>
        <Field label="Password">
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={inp} />
        </Field>
        {err && <p style={{ color: t.danger, fontSize: 13, margin: 0 }}>{err}</p>}
        {notice && <p style={{ color: t.accent, fontSize: 13 }}>{notice}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: t.textDim, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: t.accent, textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
      </p>
    </AuthShell>
  )
}

// Shared auth components
export function AuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>{children}</div>
    </div>
  )
}
export function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}
export const inp = {
  background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
  padding: '13px 14px', color: t.text, fontSize: 15, fontFamily: t.font, outline: 'none',
  transition: 'border-color 150ms ease',
}
export const primaryBtn = {
  background: t.gradient, color: t.accentInk, border: 'none', borderRadius: t.radiusSm,
  padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  fontFamily: t.font, letterSpacing: 0.3, marginTop: 4,
}
export const errText = { color: t.danger, fontSize: 13, margin: 0 }
