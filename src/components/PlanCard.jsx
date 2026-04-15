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
      background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px',
      padding: '16px', cursor: 'pointer', transition: 'border-color .15s'
    }} onMouseEnter={e => e.currentTarget.style.borderColor = c.A + '60'}
       onMouseLeave={e => e.currentTarget.style.borderColor = c.BD}>

      {/* Header: category + title + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}>{getCategoryEmoji(plan.category)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: c.T, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</span>
            {badge && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0, ...badge.style }}>{badge.label}</span>}
          </div>
          <div style={{ fontSize: '12px', color: c.A, fontWeight: '600' }}>{getCategoryLabel(plan.category, lang)}</div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '13px', color: c.M, marginBottom: '12px', overflow: 'hidden' }}>
        <span>📅 {fmtShort(plan.date, lang)}</span>
        <span>🕐 {plan.time?.slice(0, 5)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>📍 {plan.place_name}</span>
        {distance != null && <span>📏 {distance < 1 ? '<1' : Math.round(distance)} km</span>}
      </div>

      {/* Footer: organizer + spots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {organizer?.photo_url
            ? <img src={organizer.photo_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.A, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>{(organizer?.name || '?')[0].toUpperCase()}</div>
          }
          <span style={{ fontSize: '13px', color: c.T, fontWeight: '500' }}>{organizer?.name || '?'}</span>
        </div>
        <span style={{ fontSize: '12px', color: spotsLeft > 0 ? c.A : '#ef4444', fontWeight: '600' }}>
          {spotsLeft > 0 ? `${spotsLeft} ${spotsLeft !== 1 ? (t.spotsLeft || 'spots left') : (t.spotLeft || 'spot left')}` : (t.planFullLabel || 'Full')}
        </span>
      </div>
    </div>
  )
}
