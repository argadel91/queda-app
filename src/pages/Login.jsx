import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { theme as t } from '../theme.js'
import { AuthShell, Field, inp, primaryBtn } from './Signup.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  const onSubmit = async e => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setErr(error.message); return }
      navigate('/', { replace: true })
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
        queda<span style={{ color: t.accent }}>.</span>
      </h1>
      <p style={{ color: t.textDim, fontSize: 14, marginBottom: 28 }}>Welcome back</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Email">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inp} />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={inp} />
        </Field>
        {err && <p style={{ color: t.danger, fontSize: 13, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: t.textDim, textAlign: 'center' }}>
        No account yet? <Link to="/signup" style={{ color: t.accent, textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
      </p>
    </AuthShell>
  )
}
