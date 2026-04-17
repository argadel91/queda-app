import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.js'
import { genId } from '../lib/ids.js'
import { toISO } from '../lib/dates.js'
import { CATEGORIES } from '../constants/categories.js'
import PlaceInput from '../components/PlaceInput.jsx'
import { theme as t } from '../theme.js'

const GENDERS = [
  { v: 'mixed', l: 'Mixed' },
  { v: 'male', l: 'Men only' },
  { v: 'female', l: 'Women only' },
]
const JOIN_MODES = [
  { v: 'open', l: 'Open — anyone joins' },
  { v: 'approval', l: 'Approval — you review' },
  { v: 'private', l: 'Private — link only' },
]

const inp = {
  background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
  padding: '13px 14px', color: t.text, fontSize: 14, fontFamily: t.font, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const lbl = { display: 'block', fontSize: 11, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }

export default function CreatePlan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('')
  const [place, setPlace] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [capacity, setCapacity] = useState(4)
  const [joinMode, setJoinMode] = useState('open')
  const [gender, setGender] = useState('mixed')
  const [cancelHours, setCancelHours] = useState(24)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const today = toISO(new Date())
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
        cancellation_deadline_hours: cancelHours, status: 'active',
      })
      if (error) throw error
      await db.rpc('organizer_create_deposit', { p_user_id: user.id, p_plan_id: planId })
      navigate(`/plan/${planId}`, { replace: true })
    } catch (e) { setErr(e.message || String(e)) }
    setSaving(false)
  }

  return (
    <div>
      <h1 style={{ fontFamily: t.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 20px' }}>
        Create a plan
      </h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><label style={lbl}>Title</label>
          <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Football, coffee, hike…" style={inp} /></div>

        <div><label style={lbl}>Description <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <textarea maxLength={500} value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Any details people should know" style={{ ...inp, resize: 'vertical' }} /></div>

        <div><label style={lbl}>Category</label>
          <select required value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            <option value="" disabled>Select…</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select></div>

        <div><label style={lbl}>Place</label>
          <PlaceInput value={place} onSelect={setPlace} /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Date</label>
            <input type="date" required min={today} value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Time</label>
            <input type="time" required value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Capacity</label>
            <input type="number" min={2} max={20} value={capacity} onChange={e => setCapacity(+e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Cancel deadline</label>
            <input type="number" min={1} max={168} value={cancelHours} onChange={e => setCancelHours(+e.target.value)} style={inp} /></div>
        </div>

        <div><label style={lbl}>Who can join?</label>
          <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            {GENDERS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
          </select></div>

        <div><label style={lbl}>Join mode</label>
          <select value={joinMode} onChange={e => setJoinMode(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            {JOIN_MODES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select></div>

        {err && <p style={{ color: t.danger, fontSize: 13, margin: 0 }}>{err}</p>}

        <button type="submit" disabled={!valid || saving} style={{
          background: valid ? t.gradient : t.bgCard,
          color: valid ? t.accentInk : t.textDim,
          border: valid ? 'none' : `1px solid ${t.border}`,
          borderRadius: t.radiusSm, padding: '14px 16px', fontSize: 15, fontWeight: 700,
          cursor: valid ? 'pointer' : 'default', fontFamily: t.font, letterSpacing: 0.3,
        }}>
          {saving ? 'Creating…' : 'Create plan'}
        </button>
        <p style={{ fontSize: 12, color: t.textDim, textAlign: 'center', margin: 0 }}>
          Free to create. You earn +1 token when it happens.
        </p>
      </form>
    </div>
  )
}
