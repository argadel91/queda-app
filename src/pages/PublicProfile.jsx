import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import T from '../constants/translations.js'
import { fetchPublicProfile } from '../lib/supabase.js'
import CATEGORIES from '../constants/categories.js'
import { Back } from '../components/ui.jsx'

export default function PublicProfile({ c, lang }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = T[lang]
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicProfile(id).then(p => { setProfile(p); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ width: '24px', height: '24px', border: `3px solid ${c.BD}`, borderTop: `3px solid ${c.A}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ color: c.M }}>{t.profileNotFound || 'Profile not found'}</p>
      <Back onClick={() => navigate(-1)} label={t.back || 'Back'} c={c} />
    </div>
  )

  const age = profile.birthdate ? Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / 31557600000) : null
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { month: 'long', year: 'numeric' }) : null

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '0 auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <Back onClick={() => navigate(-1)} label={t.back || 'Back'} c={c} />

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        {profile.photo_url
          ? <img src={profile.photo_url} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
          : <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: c.A, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', margin: '0 auto 12px' }}>{(profile.name || '?')[0].toUpperCase()}</div>
        }
        <h2 style={{ fontFamily: "'Syne',serif", fontSize: '24px', fontWeight: '800', color: c.T, marginBottom: '2px' }}>
          {profile.name}
          {age != null && <span style={{ fontSize: '16px', fontWeight: '400', color: c.M, marginLeft: '8px' }}>{age}</span>}
        </h2>
        {profile.username && <div style={{ fontSize: '14px', color: c.M, fontWeight: '500', marginBottom: '4px' }}>@{profile.username}</div>}
        {profile.city && <div style={{ fontSize: '13px', color: c.M2 }}>📍 {profile.city}</div>}
      </div>

      {profile.bio && (
        <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: c.T, lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>
        </div>
      )}

      {profile.interests?.length > 0 && (
        <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: c.M, fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.interestsLbl || 'Interests'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.interests.map(slug => {
              const cat = CATEGORIES.find(item => item.slug === slug)
              return cat ? <span key={slug} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: `${c.A}18`, color: c.A, border: `1px solid ${c.A}35` }}>{cat.emoji} {cat.labels[lang] || cat.labels.en}</span> : null
            })}
          </div>
        </div>
      )}

      {memberSince && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: c.M2 }}>
          {t.memberSince || 'Member since'} {memberSince}
        </div>
      )}
    </div>
  )
}
