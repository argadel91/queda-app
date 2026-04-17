import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { theme as t } from '../theme.js'

const GENDERS = [
  { v: 'male', l: 'Male' }, { v: 'female', l: 'Female' },
  { v: 'non-binary', l: 'Non-binary' }, { v: 'other', l: 'Other' },
  { v: 'prefer_not_to_say', l: 'Prefer not to say' },
]
const inp = { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, padding: '13px 14px', color: t.text, fontSize: 14, fontFamily: t.font, outline: 'none', width: '100%', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setGender(profile.gender || '')
      setBio(profile.bio || '')
      if (profile.birthdate) setAge(String(new Date().getFullYear() - new Date(profile.birthdate).getFullYear()))
    }
  }, [profile])

  const onSave = async () => {
    setSaving(true); setMsg('')
    const ageNum = parseInt(age, 10)
    if (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 99) { setMsg('Age must be 18-99'); setSaving(false); return }
    const { error } = await db.from('profiles').update({
      username: username.trim() || null, gender,
      birthdate: `${new Date().getFullYear() - ageNum}-01-01`,
      bio: bio.trim() || null,
    }).eq('id', user.id)
    setSaving(false)
    if (error) { setMsg(error.message); return }
    await refreshProfile()
    setEditing(false)
    setMsg('Saved'); setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 20px' }}>Profile</h1>

      {!editing ? (
        <>
          <div style={{ padding: '20px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{profile?.username || '—'}</div>
            <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6 }}>
              {user?.email}<br />
              Gender: {profile?.gender || '—'} · Age: {profile?.birthdate ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear() : '—'}
            </div>
            {profile?.bio && <div style={{ fontSize: 14, marginTop: 8, color: t.text, lineHeight: 1.4 }}>{profile.bio}</div>}
          </div>
          <button onClick={() => setEditing(true)} style={{
            width: '100%', padding: '12px', borderRadius: t.radiusSm,
            background: t.bgCard, border: `1px solid ${t.border}`,
            color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font, marginBottom: 12,
          }}>Edit profile</button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
          <div><label style={lbl}>Display name</label><input maxLength={40} value={username} onChange={e => setUsername(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Age</label><input type="number" min={18} max={99} value={age} onChange={e => setAge(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inp, appearance: 'none' }}>
              <option value="" disabled>Select…</option>
              {GENDERS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select></div>
          <div><label style={lbl}>Bio</label><textarea maxLength={200} rows={3} value={bio} onChange={e => setBio(e.target.value)} style={{ ...inp, resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={saving} onClick={onSave} style={{ flex: 1, padding: '12px', borderRadius: t.radiusSm, border: 'none', background: t.gradient, color: t.accentInk, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: t.font }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: '12px 16px', borderRadius: t.radiusSm, background: t.bgCard, border: `1px solid ${t.border}`, color: t.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font }}>Cancel</button>
          </div>
        </div>
      )}

      {msg && <p style={{ fontSize: 13, color: msg === 'Saved' ? t.accent : t.danger, marginBottom: 12 }}>{msg}</p>}

      <Link to="/wallet" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 18px', borderRadius: t.radius,
        background: t.bgCard, border: `1px solid ${t.border}`,
        textDecoration: 'none', color: t.text, fontSize: 14, fontWeight: 600, marginBottom: 12,
      }}>
        <span>Wallet</span>
        <span style={{ fontWeight: 700, background: t.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile?.token_balance ?? '—'} tokens →</span>
      </Link>

      <button onClick={signOut} style={{
        width: '100%', background: t.dangerSoft, color: t.danger,
        border: 'none', padding: '12px 14px', borderRadius: t.radiusSm,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
      }}>Sign out</button>
    </div>
  )
}
