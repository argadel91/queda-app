import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { theme } from '../theme.js'
import { AuthShell, Field, inputStyle, primaryBtn, errText } from './Signup.jsx'

const GENDERS = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
  { v: 'non-binary', label: 'Non-binary' },
  { v: 'other', label: 'Other' },
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
    // Birthdate is stored (not age) to avoid drift; approximate from age.
    const birthYear = new Date().getFullYear() - ageNum
    const birthdate = `${birthYear}-01-01`
    // token_balance defaults to 6 in the schema; trigger log_signup_balance records the signup ledger row.
    const { error } = await db.from('profiles').insert({
      id: user.id,
      username: username.trim() || null,
      gender,
      birthdate,
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    await refreshProfile()
    navigate('/welcome', { replace: true })
  }

  return (
    <AuthShell title="Tell us about you">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Display name">
          <input required maxLength={40} value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Age">
          <input type="number" min={18} max={99} required value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Gender">
          <select required value={gender} onChange={e => setGender(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            <option value="" disabled>Select…</option>
            {GENDERS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
          </select>
        </Field>
        {err && <p style={errText}>{err}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? '…' : 'Finish'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 12, color: theme.textDim, textAlign: 'center', lineHeight: 1.5 }}>
        {"You'll start with 6 tokens. Joining a plan costs 1 — you get it back if you show up."}
      </p>
    </AuthShell>
  )
}
