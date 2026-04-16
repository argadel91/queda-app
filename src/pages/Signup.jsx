import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { theme } from '../theme.js'

// TODO(auth): replace email+password with WhatsApp OTP once Twilio / MessageBird is wired.
// Supabase supports signInWithOtp({ phone }) + verifyOtp({ phone, token, type:'sms'|'whatsapp' }).
// See queda-prompts.md PROMPT 2 for the target flow.

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
    <AuthShell title="Create your account">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
        </Field>
        <Field label="Password">
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
        </Field>
        {err && <p style={errText}>{err}</p>}
        {notice && <p style={{ color: theme.textDim, fontSize: 13 }}>{notice}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13, color: theme.textDim, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: theme.accent }}>Log in</Link>
      </p>
    </AuthShell>
  )
}

// --- Shared auth UI fragments (co-located to avoid 3 files of boilerplate) ---
export function AuthShell({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>queda</h1>
        <h2 style={{ fontSize: 14, fontWeight: 400, color: theme.textDim, margin: '0 0 24px' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: theme.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  )
}

export const inputStyle = {
  background: theme.bgElev,
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: '12px 14px',
  color: theme.text,
  fontSize: 15,
  fontFamily: theme.font,
  outline: 'none',
}

export const primaryBtn = {
  background: theme.accent,
  color: theme.accentInk,
  border: 'none',
  borderRadius: 10,
  padding: '13px 16px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: theme.font,
  letterSpacing: 0.5,
  marginTop: 8,
}

export const errText = { color: theme.danger, fontSize: 13, margin: 0 }
