import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { genId } from '../lib/ids.js'
import { CATEGORIES } from '../constants/categories.js'
import PlaceInput from '../components/PlaceInput.jsx'
import DatePicker from '../components/DatePicker.jsx'
import TimePicker from '../components/TimePicker.jsx'
import { theme as t } from '../theme.js'

const GENDERS = [
  { v: 'mixed', l: 'Mixed' },
  { v: 'male', l: 'Men only' },
  { v: 'female', l: 'Women only' },
]
const JOIN_MODES = [
  { v: 'open', l: 'Open' },
  { v: 'approval', l: 'Approval' },
  { v: 'private', l: 'Private' },
]

const inp = {
  background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
  padding: '13px 14px', color: t.text, fontSize: 14, fontFamily: t.font, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const lbl = { display: 'block', fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }

export default function CreatePlan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [place, setPlace] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [desc, setDesc] = useState('')
  const [capacity, setCapacity] = useState(6)
  const [joinMode, setJoinMode] = useState('open')
  const [gender, setGender] = useState('mixed')
  const [minAttendees, setMinAttendees] = useState(2)
  const [minTrust, setMinTrust] = useState(0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const valid = title.trim().length >= 3 && category && place?.lat && date && time

  const onSubmit = async e => {
    e.preventDefault()
    if (!valid || !user) return
    setSaving(true); setErr('')
    try {
      const planId = genId()
      const { error } = await db.from('plans').insert({
        id: planId, user_id: user.id, title: title.trim(),
        description: desc.trim() || null, category,
        place_name: place.name, place_address: place.address || null,
        lat: place.lat, lng: place.lng, date, time: time + ':00',
        capacity, join_mode: joinMode, gender_filter: gender,
        cancellation_deadline_hours: 24, status: 'active',
        min_attendees: minAttendees, min_trust: minTrust,
      })
      if (error) throw error
      navigate(`/plan/${planId}`, { replace: true })
    } catch (e) { setErr(e.message || String(e)) }
    setSaving(false)
  }

  return (
    <div>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 20px' }}>
        Create a plan
      </h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Title */}
        <div>
          <label style={lbl}>What are we doing?</label>
          <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Football, coffee, hike…" style={inp} />
        </div>

        {/* Category — 4 tap buttons */}
        <div>
          <label style={lbl}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)} style={{
                padding: '12px 0', borderRadius: t.radiusSm, cursor: 'pointer',
                border: category === c.value ? 'none' : `1px solid ${t.border}`,
                background: category === c.value ? t.gradient : t.bgCard,
                color: category === c.value ? t.accentInk : t.text,
                fontSize: 12, fontWeight: 600, fontFamily: t.font,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 150ms ease',
              }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Place */}
        <div>
          <label style={lbl}>Where?</label>
          <PlaceInput value={place} onSelect={setPlace} />
        </div>

        {/* Date */}
        <div>
          <label style={lbl}>When</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Time */}
        <div>
          <label style={lbl}>Time</label>
          <TimePicker value={time} onChange={setTime} />
        </div>

        {/* More options toggle */}
        <button type="button" onClick={() => setShowMore(!showMore)} style={{
          background: 'none', border: 'none', color: t.textDim, fontSize: 13,
          fontWeight: 600, cursor: 'pointer', fontFamily: t.font, padding: 0,
          textAlign: 'left',
        }}>
          {showMore ? '− Less options' : '+ More options'}
        </button>

        {showMore && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: t.bgCard, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <div>
              <label style={lbl}>Description</label>
              <textarea maxLength={500} value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Any details people should know" style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div>
              <label style={lbl}>Capacity</label>
              <input type="number" min={2} max={20} value={capacity} onChange={e => setCapacity(+e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Who can join?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {GENDERS.map(g => (
                  <button key={g.v} type="button" onClick={() => setGender(g.v)} style={{
                    flex: 1, padding: '10px 0', borderRadius: t.radiusSm, cursor: 'pointer',
                    border: gender === g.v ? 'none' : `1px solid ${t.border}`,
                    background: gender === g.v ? t.gradient : 'transparent',
                    color: gender === g.v ? t.accentInk : t.textDim,
                    fontSize: 12, fontWeight: 600, fontFamily: t.font,
                  }}>{g.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Join mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {JOIN_MODES.map(m => (
                  <button key={m.v} type="button" onClick={() => setJoinMode(m.v)} style={{
                    flex: 1, padding: '10px 0', borderRadius: t.radiusSm, cursor: 'pointer',
                    border: joinMode === m.v ? 'none' : `1px solid ${t.border}`,
                    background: joinMode === m.v ? t.gradient : 'transparent',
                    color: joinMode === m.v ? t.accentInk : t.textDim,
                    fontSize: 12, fontWeight: 600, fontFamily: t.font,
                  }}>{m.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Min. attendees to go ahead</label>
              <input type="number" min={2} max={capacity} value={minAttendees} onChange={e => setMinAttendees(Math.max(2, Math.min(capacity, +e.target.value)))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Minimum trust</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 0, l: 'Anyone' }, { v: 70, l: '70%' }, { v: 80, l: '80%' }, { v: 90, l: '90%' }].map(o => (
                  <button key={o.v} type="button" onClick={() => setMinTrust(o.v)} style={{
                    flex: 1, padding: '10px 0', borderRadius: t.radiusSm, cursor: 'pointer',
                    border: minTrust === o.v ? 'none' : `1px solid ${t.border}`,
                    background: minTrust === o.v ? t.gradient : 'transparent',
                    color: minTrust === o.v ? t.accentInk : t.textDim,
                    fontSize: 12, fontWeight: 600, fontFamily: t.font,
                  }}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {err && <p style={{ color: t.danger, fontSize: 13, margin: 0 }}>{err}</p>}

        <button type="submit" disabled={!valid || saving} style={{
          background: valid ? t.gradient : t.bgCard,
          color: valid ? t.accentInk : t.textDim,
          border: valid ? 'none' : `1px solid ${t.border}`,
          borderRadius: t.radiusSm, padding: '15px 16px', fontSize: 15, fontWeight: 700,
          cursor: valid ? 'pointer' : 'default', fontFamily: t.font, letterSpacing: 0.3,
        }}>
          {saving ? 'Creating…' : 'Create plan'}
        </button>
        <p style={{ fontSize: 12, color: t.textDim, textAlign: 'center', margin: 0 }}>
          Free to create. Show up and build your trust score.
        </p>
      </form>
    </div>
  )
}
