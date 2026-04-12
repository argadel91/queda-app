import React, { useState, useRef } from 'react'
import T from '../constants/translations.js'
import CATEGORIES from '../constants/categories.js'
import { db, uploadAvatar, showToast } from '../lib/supabase.js'
import { Btn, Back, Lbl } from '../components/ui.jsx'
import CityInput from '../components/CityInput.jsx'

const FLAGS = { es: '🇪🇸', en: '🇬🇧', pt: '🇵🇹', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹' }
const LANG_NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano' }
const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it']
const GENDERS = ['male', 'female', 'non-binary', 'other', 'prefer_not_to_say']
const GENDER_KEY = { male: 'genderMale', female: 'genderFemale', 'non-binary': 'genderNonBinary', other: 'genderOther', prefer_not_to_say: 'genderPreferNot' }

export default function Profile({ onBack, c, lang, authUser, profile, onUpdateProfile, onSignOut, onLangChange, onThemeToggle, theme, onboard }) {
  const t = T[lang]
  const [editing, setEditing] = useState(!!onboard)
  const [newName, setNewName] = useState(profile?.name || '')
  const [newUsername, setNewUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [birthdate, setBirthdate] = useState(profile?.birthdate || '')
  const [gender, setGender] = useState(profile?.gender || '')
  const [interests, setInterests] = useState(profile?.interests || [])
  const [cityLabel, setCityLabel] = useState(profile?.city || '')
  const [cityData, setCityData] = useState(profile?.lat ? { lat: profile.lat, lng: profile.lng } : null)
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [usernameErr, setUsernameErr] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const toggleInterest = slug => {
    setInterests(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const handlePhoto = async e => {
    const file = e.target.files?.[0]
    if (!file || !authUser) return
    setUploading(true)
    try {
      const url = await uploadAvatar(authUser.id, file)
      setPhotoUrl(url + '?t=' + Date.now())
    } catch (e) { console.error('handlePhoto:', e) }
    setUploading(false)
  }

  const save = async () => {
    if (!newName.trim()) return
    const uname = newUsername.trim() || null
    if (uname && uname !== profile?.username) {
      const { data } = await db.from('profiles').select('id').eq('username', uname).maybeSingle()
      if (data && data.id !== authUser?.id) { setUsernameErr(t.usernameTaken || 'Username already taken'); return }
    }
    setSaving(true); setUsernameErr('')
    await onUpdateProfile({
      name: newName.trim(),
      username: uname,
      bio: bio.trim() || null,
      birthdate: birthdate || null,
      gender: gender || null,
      interests: interests.length ? interests : null,
      city: cityLabel || null,
      lat: cityData?.lat || null,
      lng: cityData?.lng || null,
      photo_url: photoUrl || null,
    })
    setSaving(false); setEditing(false)
    showToast(t.profileSaved || 'Profile saved')
  }

  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000) : null

  const inputStyle = { background: c.CARD2, border: `1px solid ${c.BD}`, borderRadius: '8px', padding: '10px 12px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }

  const onboardProgress = onboard ? [newName.trim(), birthdate, interests.length > 0].filter(Boolean).length : 0

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
      {onBack && <Back onClick={onBack} label={t.back} c={c} />}
      <h2 style={{ fontFamily: "'Syne',serif", fontSize: '24px', fontWeight: '800', color: c.T, marginBottom: '16px' }}>{t.myProfile || 'My profile'}</h2>

      {onboard && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < onboardProgress ? c.A : c.BD, transition: 'background .2s' }} />
            ))}
          </div>
          <p style={{ fontSize: '14px', color: c.M, textAlign: 'center' }}>{t.onboardProgress || `${onboardProgress}/3 — ${onboardProgress < 3 ? (t.onboardHint || 'Fill in name, birthdate and interests to continue') : (t.onboardReady || 'Ready! Hit save')}`}</p>
        </div>
      )}

      <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '20px' }}>
        {!editing ? <>
          {/* View mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            {photoUrl
              ? <img src={photoUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: c.A, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', flexShrink: 0 }}>{(profile?.name || '?')[0].toUpperCase()}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: c.T }}>
                {profile?.name || '—'}
                {age != null && <span style={{ fontSize: '14px', fontWeight: '400', color: c.M, marginLeft: '8px' }}>{age}</span>}
              </div>
              {profile?.username && <div style={{ fontSize: '13px', color: c.A, fontWeight: '600' }}>@{profile.username}</div>}
              {profile?.city && <div style={{ fontSize: '12px', color: c.M2 }}>📍 {profile.city}</div>}
            </div>
          </div>

          {profile?.bio && <div style={{ fontSize: '14px', color: c.T, lineHeight: 1.5, marginBottom: '12px' }}>{profile.bio}</div>}

          {profile?.interests?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {profile.interests.map(slug => {
                const cat = CATEGORIES.find(item => item.slug === slug)
                return cat ? <span key={slug} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: `${c.A}18`, color: c.A, border: `1px solid ${c.A}35` }}>{cat.emoji} {cat.labels[lang] || cat.labels.en}</span> : null
              })}
            </div>
          )}

          {gender && (
            <div style={{ fontSize: '12px', color: c.M2, marginBottom: '16px' }}>{t[GENDER_KEY[gender]]}</div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setEditing(true); setNewName(profile?.name || ''); setNewUsername(profile?.username || ''); setBio(profile?.bio || ''); setBirthdate(profile?.birthdate || ''); setGender(profile?.gender || ''); setInterests(profile?.interests || []); setCityLabel(profile?.city || ''); setPhotoUrl(profile?.photo_url || '') }} style={{ flex: 1, padding: '10px', background: c.CARD2, border: `1px solid ${c.BD}`, borderRadius: '10px', color: c.T, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600' }}>{t.editBtn || 'Edit'}</button>
            <button onClick={() => { if (window.confirm(t.signOutConfirm || 'Sign out?')) onSignOut() }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #ef444440', borderRadius: '10px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '500' }}>{t.signOut}</button>
          </div>
        </> : <>
          {/* Edit mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {photoUrl
                ? <img src={photoUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => fileRef.current?.click()} />
                : <div onClick={() => fileRef.current?.click()} style={{ width: '60px', height: '60px', borderRadius: '50%', background: c.CARD2, border: `2px dashed ${c.BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', color: c.M }}>📷</div>
              }
              <div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: c.CARD2, border: `1px solid ${c.BD}`, borderRadius: '8px', padding: '6px 12px', color: c.T, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                  {uploading ? '...' : (t.changePhoto || 'Change photo')}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
            </div>

            {/* Name */}
            <div>
              <Lbl c={c} htmlFor="profile-name">{t.nameLbl || 'Name'}</Lbl>
              <input id="profile-name" value={newName} onChange={e => setNewName(e.target.value.slice(0, 50))} maxLength={50} placeholder={t.yourNamePh2 || 'Your name'} style={inputStyle} />
            </div>

            {/* Username */}
            <div>
              <Lbl c={c} htmlFor="profile-username">{t.usernameLbl || 'Username'}</Lbl>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: c.M, fontSize: '15px', fontWeight: '600' }}>@</span>
                <input id="profile-username" value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))} placeholder="username" style={{ ...inputStyle, flex: 1, width: 'auto' }} />
              </div>
              {usernameErr && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{usernameErr}</div>}
            </div>

            {/* Bio */}
            <div>
              <Lbl c={c} htmlFor="profile-bio">{t.bioLbl || 'Bio'}</Lbl>
              <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value.slice(0, 300))} maxLength={300} rows={3} placeholder={t.bioPlaceholder || 'Tell something about yourself...'} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              <div style={{ fontSize: '11px', color: c.M2, textAlign: 'right' }}>{bio.length}/300</div>
            </div>

            {/* Birthdate */}
            <div>
              <Lbl c={c} htmlFor="profile-birthdate">{t.birthdateLbl || 'Date of birth'}</Lbl>
              <input id="profile-birthdate" type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} max={new Date().toISOString().slice(0, 10)} style={inputStyle} />
            </div>

            {/* Gender */}
            <div>
              <Lbl c={c}>{t.genderLbl || 'Gender'}</Lbl>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setGender(gender === g ? '' : g)} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${gender === g ? c.A : c.BD}`, background: gender === g ? `${c.A}18` : 'transparent', color: gender === g ? c.A : c.T, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                    {t[GENDER_KEY[g]]}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <Lbl c={c}>{t.cityLbl || 'City'}</Lbl>
              <CityInput value={cityLabel} onChange={setCityLabel} onSelect={sel => { setCityLabel(sel.label); setCityData({ lat: sel.lat, lng: sel.lng }) }} placeholder={t.cityPlaceholder || 'Your city'} c={c} />
            </div>

            {/* Interests */}
            <div>
              <Lbl c={c}>{t.interestsLbl || 'Interests'}</Lbl>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CATEGORIES.filter(cat => cat.slug !== 'other').map(cat => {
                  const active = interests.includes(cat.slug)
                  return (
                    <button key={cat.slug} onClick={() => toggleInterest(cat.slug)} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${active ? c.A : c.BD}`, background: active ? `${c.A}18` : 'transparent', color: active ? c.A : c.T, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                      {cat.emoji} {cat.labels[lang] || cat.labels.en}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <Lbl c={c}>{t.langLbl || 'Language'}</Lbl>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {LANGS.map(l => (
                  <button key={l} onClick={() => onLangChange(l)} style={{ padding: '10px 14px', minHeight: '44px', borderRadius: '20px', border: `1px solid ${lang === l ? c.A : c.BD}`, background: lang === l ? `${c.A}18` : 'transparent', color: lang === l ? c.A : c.T, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                    {FLAGS[l]} {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {!onboard && <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '12px', background: c.CARD2, border: `1px solid ${c.BD}`, borderRadius: '10px', color: c.T, cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', fontSize: '14px' }}>{t.cancel || 'Cancel'}</button>}
              <Btn onClick={save} disabled={!newName.trim() || saving} full style={{ flex: 1 }} c={c}>{saving ? '...' : (t.saveLbl || 'Save')}</Btn>
            </div>
          </div>
        </>}
      </div>
    </div>
  )
}
