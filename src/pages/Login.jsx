import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { theme } from '../theme.js'
import { AuthShell, Field, inputStyle, primaryBtn, errText } from './Signup.jsx'

// TODO(auth): swap for phone OTP once provider is configured.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  const onSubmit = async e => {
    e.preventDefault()
    setErr(''); setLoading(true)
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    navigate('/', { replace: true })
  }

  return (
    <AuthShell title="Welcome back">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={inputStyle} />
        </Field>
        {err && <p style={errText}>{err}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13, color: theme.textDim, textAlign: 'center' }}>
        No account yet? <Link to="/signup" style={{ color: theme.accent }}>Sign up</Link>
      </p>
    </AuthShell>
  )
}
