import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { theme as t } from '../theme.js'
import { AuthShell, Field, inp, primaryBtn } from './Signup.jsx'

const GENDERS = [
  { v: 'male', label: 'Male' }, { v: 'female', label: 'Female' },
  { v: 'non-binary', label: 'Non-binary' }, { v: 'other', label: 'Other' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async e => {
    e.preventDefault()
    setErr('')
    if (!user) { setErr('Not signed in'); return }
    const ageNum = parseInt(age, 10)
    if (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 99) { setErr('Age must be 18-99'); return }
    setLoading(true)
    try {
      const birthYear = new Date().getFullYear() - ageNum
      const { error } = await db.from('profiles').insert({
        id: user.id, username: username.trim() || null,
        gender, birthdate: `${birthYear}-01-01`,
      })
      if (error) { setErr(error.message); return }
      await refreshProfile()
      navigate('/welcome', { replace: true })
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>About you</h1>
      <p style={{ color: t.textDim, fontSize: 14, marginBottom: 24 }}>Just the basics. Takes 10 seconds.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Display name" htmlFor="ob-username">
          <input id="ob-username" required maxLength={40} value={username} onChange={e => setUsername(e.target.value)} aria-invalid={!!err} style={inp} />
        </Field>
        <Field label="Age" htmlFor="ob-age">
          <input id="ob-age" type="number" min={18} max={99} required value={age} onChange={e => setAge(e.target.value)} aria-invalid={!!err} style={inp} />
        </Field>
        <Field label="Gender" htmlFor="ob-gender">
          <select id="ob-gender" required value={gender} onChange={e => setGender(e.target.value)} aria-invalid={!!err} style={{ ...inp, appearance: 'none' }}>
            <option value="" disabled>Select…</option>
            {GENDERS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
          </select>
        </Field>
        {err && <p role="alert" style={{ color: t.danger, fontSize: 13, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Continue'}
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 12, color: t.textDim, textAlign: 'center', lineHeight: 1.5 }}>
        {"Show up to plans and build your trust score. Others can see how reliable you are."}
      </p>
    </AuthShell>
  )
}
