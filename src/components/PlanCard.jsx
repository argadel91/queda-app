import React from 'react'
import T from '../constants/translations.js'
import { getCategoryEmoji, getCategoryLabel } from '../constants/categories.js'
import { fmtShort, fmtTime } from '../lib/utils.js'

export default function PlanCard({ plan, lang, c, distance, onClick, badge }) {
  const t = T[lang] || T.en
  const organizer = plan.profiles
  const spotsLeft = plan.capacity - (plan.participant_count || 0)

  return (
    <div onClick={onClick} style={{
      background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '20px',
      padding: '18px', cursor: 'pointer', transition: 'border-color .2s, box-shadow .2s',
      boxShadow: '0 2px 12px rgba(0,0,0,.15)'
    }} onMouseEnter={e => { e.currentTarget.style.borderColor = c.A + '60'; e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,.25)` }}
       onMouseLeave={e => { e.currentTarget.style.borderColor = c.BD; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.15)' }}>

      {/* Header: emoji circle + title + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${c.A}15`, border: `1px solid ${c.A}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
          {getCategoryEmoji(plan.category)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontFamily: "'Syne',serif", fontSize: '17px', fontWeight: '800', color: c.T, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>{plan.title}</span>
            {badge && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0, ...badge.style }}>{badge.label}</span>}
          </div>
          <div style={{ fontSize: '12px', color: c.M, fontWeight: '500' }}>{getCategoryLabel(plan.category, lang)}</div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: '13px', color: c.M, marginBottom: '14px' }}>
        <span>📅 {fmtShort(plan.date, lang)}</span>
        <span>🕐 {plan.time?.slice(0, 5)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>📍 {plan.place_name}</span>
        {distance != null && <span>📏 {distance < 1 ? '<1' : Math.round(distance)} km</span>}
      </div>

      {/* Footer: organizer + spots pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {organizer?.photo_url
            ? <img src={organizer.photo_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.A, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>{(organizer?.name || '?')[0].toUpperCase()}</div>
          }
          <span style={{ fontSize: '13px', color: c.T, fontWeight: '500' }}>{organizer?.name || '?'}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: spotsLeft > 0 ? `${c.A}18` : '#ef444418', color: spotsLeft > 0 ? c.A : '#ef4444' }}>
          {spotsLeft > 0 ? `${spotsLeft} ${spotsLeft !== 1 ? (t.spotsLeft || 'spots left') : (t.spotLeft || 'spot left')}` : (t.planFullLabel || 'Full')}
        </span>
      </div>
    </div>
  )
}
