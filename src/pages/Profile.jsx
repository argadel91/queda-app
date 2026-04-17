import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { theme } from '../theme.js'

const GENDERS = [
  { v: 'male', l: 'Male' },
  { v: 'female', l: 'Female' },
  { v: 'non-binary', l: 'Non-binary' },
  { v: 'other', l: 'Other' },
  { v: 'prefer_not_to_say', l: 'Prefer not to say' },
]

const inp = {
  background: theme.bgElev, border: `1px solid ${theme.border}`, borderRadius: 10,
  padding: '12px 14px', color: theme.text, fontSize: 14, fontFamily: theme.font,
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
const lbl = { display: 'block', fontSize: 11, color: theme.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }

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
      if (profile.birthdate) {
        const birthYear = new Date(profile.birthdate).getFullYear()
        setAge(String(new Date().getFullYear() - birthYear))
      }
    }
  }, [profile])

  const onSave = async () => {
    setSaving(true); setMsg('')
    const ageNum = parseInt(age, 10)
    if (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 99) { setMsg('Age must be 18-99'); setSaving(false); return }
    const birthYear = new Date().getFullYear() - ageNum
    const { error } = await db.from('profiles').update({
      username: username.trim() || null,
      gender,
      birthdate: `${birthYear}-01-01`,
      bio: bio.trim() || null,
    }).eq('id', user.id)
    setSaving(false)
    if (error) { setMsg(error.message); return }
    await refreshProfile()
    setEditing(false)
    setMsg('Saved')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>Profile</h1>

      {!editing ? (
        <>
          <div style={{ color: theme.textDim, fontSize: 13, lineHeight: 1.8 }}>
            <div><span style={{ color: theme.text, fontSize: 16, fontWeight: 600 }}>{profile?.username || '—'}</span></div>
            <div>{user?.email}</div>
            <div>Gender: {profile?.gender || '—'}</div>
            <div>Age: {profile?.birthdate ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear() : '—'}</div>
            {profile?.bio && <div style={{ marginTop: 4, color: theme.text }}>{profile.bio}</div>}
          </div>
          <button onClick={() => setEditing(true)} style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 10,
            background: theme.bgElev, border: `1px solid ${theme.border}`,
            color: theme.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
          }}>Edit profile</button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={lbl}>Display name</label>
            <input maxLength={40} value={username} onChange={e => setUsername(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Age</label>
            <input type="number" min={18} max={99} value={age} onChange={e => setAge(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inp, appearance: 'none' }}>
              <option value="" disabled>Select…</option>
              {GENDERS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select></div>
          <div><label style={lbl}>Bio <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <textarea maxLength={200} rows={3} value={bio} onChange={e => setBio(e.target.value)} style={{ ...inp, resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={saving} onClick={onSave} style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: theme.accent, color: theme.accentInk, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: theme.font,
            }}>{saving ? '…' : 'Save'}</button>
            <button onClick={() => setEditing(false)} style={{
              padding: '12px 16px', borderRadius: 10, background: theme.bgElev,
              border: `1px solid ${theme.border}`, color: theme.textDim, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {msg && <p style={{ marginTop: 12, fontSize: 13, color: msg === 'Saved' ? theme.accent : theme.danger }}>{msg}</p>}

      <Link to="/wallet" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 20, padding: '14px 16px', borderRadius: 12,
        background: theme.bgElev, border: `1px solid ${theme.border}`,
        textDecoration: 'none', color: theme.text, fontSize: 14, fontWeight: 600,
      }}>
        <span>Wallet</span>
        <span style={{ color: theme.accent }}>{profile?.token_balance ?? '—'} tokens →</span>
      </Link>

      <button onClick={signOut} style={{
        marginTop: 16, width: '100%', background: 'transparent', color: theme.danger,
        border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 10,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
      }}>Sign out</button>
    </div>
  )
}
