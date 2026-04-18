import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { getTrustScore, getActivityScore, getSocialScore, getRecentPlans, formatTrust } from '../lib/trust.js'
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
  const [trust, setTrust] = useState(-1)
  const [activity, setActivity] = useState(0)
  const [social, setSocial] = useState(0)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setGender(profile.gender || '')
      setBio(profile.bio || '')
      if (profile.birthdate) setAge(String(new Date().getFullYear() - new Date(profile.birthdate).getFullYear()))
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    getTrustScore(user.id).then(setTrust)
    getActivityScore(user.id).then(setActivity)
    getSocialScore(user.id).then(setSocial)
    getRecentPlans(user.id).then(setRecent)
  }, [user?.id])

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

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '—'

  return (
    <div>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 20px' }}>Profile</h1>

      {/* Trust + stats card */}
      <div style={{ padding: '24px 20px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}`, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Trust</div>
        <div style={{
          fontSize: 48, fontWeight: 800, fontFamily: t.fontHead, lineHeight: 1,
          color: trust < 0 ? t.textDim : t.accent, marginBottom: 8,
        }}>{formatTrust(trust)}</div>
        {trust >= 0 && (
          <div style={{ width: '100%', height: 6, borderRadius: 999, background: t.border, marginBottom: 16 }}>
            <div style={{ width: `${trust}%`, height: '100%', borderRadius: 999, background: t.gradient, transition: 'width 300ms ease' }} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: trust >= 0 ? 0 : 16 }}>
          <Stat label="Activity" value={`${activity} plans`} />
          <Stat label="Social" value={`${social} invited`} />
          <Stat label="Member" value={memberSince} />
        </div>
      </div>

      {/* Profile info */}
      {!editing ? (
        <>
          <div style={{ padding: '16px 18px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{profile?.username || '—'}</div>
            <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6 }}>
              {user?.email}<br />
              Gender: {profile?.gender || '—'} · Age: {profile?.birthdate ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear() : '—'}
            </div>
            {profile?.bio && <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.4 }}>{profile.bio}</div>}
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

      {/* Recent plans */}
      {recent.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 11, color: t.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Recent plans</h2>
          {recent.map((p, i) => (
            <div key={`${p.id}-${i}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: `1px solid ${t.border}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                  {p.role === 'organizer' ? 'Organised' : p.attended ? 'Attended' : p.attended === false ? 'Missed' : 'Joined'}
                  {' · '}{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                color: p.role === 'organizer' ? t.accent : p.attended ? t.accent : p.attended === false ? t.danger : t.textDim,
                background: p.role === 'organizer' ? t.accentSoft : p.attended ? t.accentSoft : p.attended === false ? t.dangerSoft : t.bgElev,
              }}>
                {p.role === 'organizer' ? '📣' : p.attended ? '✓' : p.attended === false ? '✗' : '—'}
              </span>
            </div>
          ))}
        </section>
      )}

      <button onClick={signOut} style={{
        width: '100%', marginTop: 20, background: t.dangerSoft, color: t.danger,
        border: 'none', padding: '12px 14px', borderRadius: t.radiusSm,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: t.font,
      }}>Sign out</button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{value}</div>
    </div>
  )
}
