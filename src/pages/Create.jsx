import React, { useState } from 'react'
import T from '../constants/translations.js'
import { createPlan, joinPlan, showErr } from '../lib/supabase.js'
import { PLAN_STATUS, JOIN_MODE } from '../constants/status.js'
import { genId, fmtShort } from '../lib/utils.js'
import { Btn, Back, Lbl } from '../components/ui.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import ClockPicker from '../components/ClockPicker.jsx'
import CategoryPicker from '../components/CategoryPicker.jsx'
import PlaceSearch from '../components/PlaceSearch.jsx'
import { getCategoryEmoji, getCategoryLabel } from '../constants/categories.js'

export default function Create({ onBack, onCreated, c, lang, authUser, profile }) {
  const t = T[lang]
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState([])
  const [time, setTime] = useState('')
  const [place, setPlace] = useState(null)
  const [capacity, setCapacity] = useState(4)
  const [joinMode, setJoinMode] = useState(JOIN_MODE.OPEN)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  const canCreate = title.trim() && category && date.length === 1 && time && place?.lat

  const handleCreate = async () => {
    if (!canCreate || !authUser) return
    setSaving(true)
    try {
      const plan = {
        id: genId(),
        user_id: authUser.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        place_name: place.name,
        place_address: place.address || null,
        lat: place.lat,
        lng: place.lng,
        date: date[0],
        time: time + ':00',
        capacity,
        join_mode: joinMode,
        status: PLAN_STATUS.ACTIVE,
      }
      await createPlan(plan)
      // Organizer auto-joins
      await joinPlan(plan.id, authUser.id)
      setCreated(plan)
    } catch (e) { showErr(t.createError || 'Error creating plan') }
    setSaving(false)
  }

  // Done screen
  if (created) {
    const shareUrl = `https://www.queda.xyz/plan/${created.id}`
    const shareText = `${getCategoryEmoji(created.category)} ${created.title} — ${shareUrl}`
    return (
      <div style={{ padding: '48px 24px', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{getCategoryEmoji(created.category)}</div>
        <h2 style={{ fontFamily: "'Syne',serif", fontSize: '28px', fontWeight: '800', color: c.A, marginBottom: '8px' }}>{t.planCreatedTitle || 'Plan created!'}</h2>
        <p style={{ color: c.T, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{created.title}</p>
        <p style={{ color: c.M2, fontSize: '14px', marginBottom: '24px' }}>
          {fmtShort(created.date, lang)} · {time} · {created.place_name}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank')} style={{ flex: 1, padding: '12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>WhatsApp</button>
            <button onClick={() => window.open('https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText), '_blank')} style={{ flex: 1, padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Telegram</button>
            <button onClick={() => { navigator.clipboard?.writeText(shareUrl) }} style={{ flex: 1, padding: '12px', background: c.CARD2, color: c.T, border: `1px solid ${c.BD}`, borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>🔗 {t.copyLink || 'Copy'}</button>
          </div>
          {onCreated && <Btn onClick={() => onCreated(created)} full style={{ padding: '14px' }} c={c}>{t.viewPlan || 'View plan'}</Btn>}
          <button onClick={onBack} style={{ padding: '12px', background: 'none', border: 'none', color: c.M2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>{t.homeBtn || 'Home'}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
      <Back onClick={onBack} label={t.back} c={c} />
      <h2 style={{ fontFamily: "'Syne',serif", fontSize: '26px', fontWeight: '800', color: c.T, marginBottom: '20px' }}>{t.createPlan || 'Create a plan'}</h2>

      {/* Title */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c} htmlFor="plan-title">{t.titleLbl || 'What are we doing?'}</Lbl>
        <input id="plan-title" value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} maxLength={100} placeholder={t.titlePlaceholder || 'Football, coffee, hiking...'} style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', padding: '12px 14px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      </div>

      {/* Category */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.categoryLbl || 'Category'}</Lbl>
        <CategoryPicker value={category} onChange={setCategory} lang={lang} c={c} />
      </div>

      {/* Date */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.dateLbl || 'When?'}</Lbl>
        <CalendarPicker selected={date} onChange={d => setDate(d.slice(-1))} c={c} lang={lang} max={1} />
      </div>

      {/* Time */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.timeLbl || 'What time?'}</Lbl>
        <ClockPicker value={time} onChange={setTime} c={c} />
      </div>

      {/* Place */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.placeLbl || 'Where?'}</Lbl>
        {place ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: c.CARD, border: `1px solid ${c.A}30`, borderRadius: '12px' }}>
            {place.photo && <img src={place.photo} alt="" style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', color: c.T, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
              {place.address && <div style={{ fontSize: '12px', color: c.M2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</div>}
            </div>
            <button onClick={() => setPlace(null)} style={{ background: 'none', border: 'none', color: c.M, cursor: 'pointer', fontSize: '18px', flexShrink: 0, padding: '4px' }}>×</button>
          </div>
        ) : (
          <PlaceSearch value={place} onSelect={setPlace} placeholder={t.searchPlacePh || 'Search a place...'} c={c} lang={lang} />
        )}
      </div>

      {/* Capacity */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.capacityLbl || 'Max people'}</Lbl>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setCapacity(c => Math.max(2, c - 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c.CARD, border: `1px solid ${c.BD}`, color: c.T, fontSize: '18px', cursor: 'pointer', fontFamily: 'inherit' }}>−</button>
          <span style={{ fontSize: '22px', fontWeight: '800', color: c.T, minWidth: '32px', textAlign: 'center' }}>{capacity}</span>
          <button onClick={() => setCapacity(c => Math.min(20, c + 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c.CARD, border: `1px solid ${c.BD}`, color: c.T, fontSize: '18px', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
          <span style={{ fontSize: '12px', color: c.M2 }}>{t.peopleIncluding || 'people (including you)'}</span>
        </div>
      </div>

      {/* Join mode */}
      <div style={{ marginBottom: '18px' }}>
        <Lbl c={c}>{t.joinModeLbl || 'Who can join?'}</Lbl>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[JOIN_MODE.OPEN, JOIN_MODE.CLOSED].map(mode => (
            <button key={mode} onClick={() => setJoinMode(mode)} style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              border: `1px solid ${joinMode === mode ? c.A : c.BD}`,
              background: joinMode === mode ? `${c.A}18` : 'transparent',
              color: joinMode === mode ? c.A : c.T,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
              textAlign: 'center'
            }}>
              {mode === JOIN_MODE.OPEN ? (t.joinOpen || 'Anyone can join') : (t.joinClosed || 'Approval needed')}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <Lbl c={c} htmlFor="plan-desc">{t.descLbl || 'Description (optional)'}</Lbl>
        <textarea id="plan-desc" value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} maxLength={500} rows={3} placeholder={t.descPlaceholder || 'Any extra details...'} style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', padding: '12px 14px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }} />
      </div>

      {/* Create button */}
      <Btn onClick={handleCreate} disabled={!canCreate || saving} full style={{ padding: '16px', fontSize: '16px' }} c={c}>
        {saving ? '...' : (t.createPlanBtn || 'Create plan')}
      </Btn>
    </div>
  )
}
