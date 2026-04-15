import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import T from '../constants/translations.js'
import { JOIN_STATUS, JOIN_MODE } from '../constants/status.js'
import { fetchPlan, fetchParticipants, joinPlan, requestJoin, leavePlan, updateParticipant, deletePlan, db, showErr, showToast } from '../lib/supabase.js'
import { getCategoryEmoji, getCategoryLabel } from '../constants/categories.js'
import { fmtDate, fmtTime } from '../lib/utils.js'
import { Btn, Back } from '../components/ui.jsx'
import Chat from '../components/Chat.jsx'

export default function PlanDetail({ c, lang, authUser }) {
  const { id } = useParams()
  const [tab, setTab] = useState('info')
  const navigate = useNavigate()
  const t = T[lang]
  const [plan, setPlan] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const load = async () => {
    const [p, pp] = await Promise.all([fetchPlan(id), fetchParticipants(id)])
    setPlan(p)
    setParticipants(pp || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Realtime subscription for participants
  useEffect(() => {
    let hadError = false
    const channel = db.channel('pp-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_participants', filter: `plan_id=eq.${id}` }, () => {
        fetchParticipants(id).then(pp => setParticipants(pp || []))
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') hadError = true
        if (status === 'SUBSCRIBED' && hadError) { hadError = false; load() }
      })
    return () => { db.removeChannel(channel) }
  }, [id])

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ width: '24px', height: '24px', border: `3px solid ${c.BD}`, borderTop: `3px solid ${c.A}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
    </div>
  )

  if (!plan) return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤷</div>
      <p style={{ color: c.M }}>{t.planNotFound || 'Plan not found'}</p>
      <Back onClick={() => navigate('/')} label={t.back || 'Back'} c={c} />
    </div>
  )

  const organizer = plan.profiles
  const isOrganizer = authUser?.id === plan.user_id
  const myParticipation = participants.find(p => p.user_id === authUser?.id)
  const joinedParticipants = participants.filter(p => p.status === JOIN_STATUS.JOINED)
  const pendingParticipants = participants.filter(p => p.status === JOIN_STATUS.PENDING)
  const spotsLeft = plan.capacity - joinedParticipants.length
  const isFull = spotsLeft <= 0
  const isJoined = myParticipation?.status === JOIN_STATUS.JOINED
  const isPending = myParticipation?.status === JOIN_STATUS.PENDING

  const handleJoin = async () => {
    if (!authUser) return
    setJoining(true)
    try {
      if (plan.join_mode === JOIN_MODE.OPEN) {
        await joinPlan(id, authUser.id)
      } else {
        await requestJoin(id, authUser.id)
      }
      await load()
    } catch (e) {
      if (e?.message?.includes('Plan is full')) {
        showErr(t.planFull || 'Plan is full')
      } else {
        showErr(t.joinError || 'Error joining plan')
      }
      await load()
    }
    setJoining(false)
  }

  const handleLeave = async () => {
    if (!authUser) return
    if (!window.confirm(t.leaveConfirm || 'Leave this plan?')) return
    setJoining(true)
    try {
      await leavePlan(id, authUser.id)
      await load()
    } catch (e) { console.error('handleLeave:', e) }
    setJoining(false)
  }

  const handleApprove = async (userId) => {
    await updateParticipant(id, userId, JOIN_STATUS.JOINED)
    await load()
  }

  const handleReject = async (userId) => {
    await updateParticipant(id, userId, JOIN_STATUS.REJECTED)
    await load()
  }

  const shareUrl = `https://www.queda.xyz/plan/${plan.id}`
  const shareText = `${getCategoryEmoji(plan.category)} ${plan.title} — ${shareUrl}`

  const age = (birthdate) => {
    if (!birthdate) return null
    return Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <Back onClick={() => navigate('/')} label={t.back || 'Back'} c={c} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>{getCategoryEmoji(plan.category)}</div>
        <h1 style={{ fontFamily: "'Syne',serif", fontSize: '26px', fontWeight: '800', color: c.T, marginBottom: '4px' }}>{plan.title}</h1>
        <div style={{ fontSize: '13px', color: c.A, fontWeight: '600' }}>{getCategoryLabel(plan.category, lang)}</div>
      </div>

      {/* Tabs — only show Chat if user is joined or organizer */}
      {(isJoined || isOrganizer) && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: c.CARD, borderRadius: '12px', padding: '4px', border: `1px solid ${c.BD}` }}>
          {['info', 'chat'].map(t2 => (
            <button key={t2} onClick={() => setTab(t2)} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              background: tab === t2 ? c.A : 'transparent',
              color: tab === t2 ? '#0A0A0A' : c.M,
              fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .15s'
            }}>
              {t2 === 'info' ? (lang === 'es' ? 'Info' : 'Info') : (lang === 'es' ? 'Chat' : 'Chat')}
            </button>
          ))}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (isJoined || isOrganizer) ? (
        <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
          <Chat planId={id} userId={authUser?.id} c={c} lang={lang} />
        </div>
      ) : <>

      {/* Info card */}
      <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <span style={{ fontSize: '15px', color: c.T, fontWeight: '500' }}>{fmtDate(plan.date, lang)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🕐</span>
            <span style={{ fontSize: '15px', color: c.T, fontWeight: '500' }}>{plan.time?.slice(0, 5)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📍</span>
            <div>
              <div style={{ fontSize: '15px', color: c.T, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.place_name}</div>
              {plan.place_address && <div style={{ fontSize: '12px', color: c.M2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.place_address}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>👥</span>
            <span style={{ fontSize: '15px', color: c.T, fontWeight: '500' }}>{joinedParticipants.length}/{plan.capacity} {t.people || 'people'}</span>
            <span style={{ fontSize: '12px', color: spotsLeft > 0 ? c.A : '#ef4444', fontWeight: '600' }}>
              {spotsLeft > 0 ? `(${spotsLeft} ${t.spotsLeft || 'spots left'})` : `(${t.full || 'Full'})`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{plan.join_mode === JOIN_MODE.OPEN ? '🔓' : '🔒'}</span>
            <span style={{ fontSize: '13px', color: c.M }}>{plan.join_mode === JOIN_MODE.OPEN ? (t.joinOpen || 'Anyone can join') : (t.joinClosed || 'Approval needed')}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: c.T, lineHeight: 1.6, margin: 0 }}>{plan.description}</p>
        </div>
      )}

      {/* Organizer */}
      <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: c.M, fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.organizer || 'Organizer'}</div>
        <div onClick={() => organizer?.id && navigate('/profile/' + organizer.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: organizer?.id ? 'pointer' : 'default' }}>
          {organizer?.photo_url
            ? <img src={organizer.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: c.A, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800' }}>{(organizer?.name || '?')[0].toUpperCase()}</div>
          }
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: c.T }}>{organizer?.name || '?'}</div>
            {organizer?.username && <div style={{ fontSize: '12px', color: c.M }}>@{organizer.username}</div>}
            {organizer?.city && <div style={{ fontSize: '11px', color: c.M2 }}>📍 {organizer.city}</div>}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: c.M, fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '10px' }}>
          {t.participants || 'Participants'} ({joinedParticipants.length})
        </div>
        {joinedParticipants.length === 0 ? (
          <p style={{ fontSize: '13px', color: c.M2 }}>{t.noParticipantsYet || 'No one has joined yet'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {joinedParticipants.map(pp => {
              const p = pp.profiles
              return (
                <div key={pp.id} onClick={() => p?.id && navigate('/profile/' + p.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: p?.id ? 'pointer' : 'default' }}>
                  {p?.photo_url
                    ? <img src={p.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.CARD2, color: c.T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>{(p?.name || '?')[0].toUpperCase()}</div>
                  }
                  <div style={{ fontSize: '14px', color: c.T, fontWeight: '500' }}>
                    {p?.name || '?'}
                    {age(p?.birthdate) && <span style={{ color: c.M, fontWeight: '400', marginLeft: '6px' }}>{age(p.birthdate)}</span>}
                  </div>
                  {pp.user_id === plan.user_id && <span style={{ fontSize: '10px', color: c.M, fontWeight: '700', background: `${c.BD}`, padding: '2px 8px', borderRadius: '10px' }}>ORG</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending requests (organizer only) */}
      {isOrganizer && pendingParticipants.length > 0 && (
        <div style={{ background: c.CARD, border: `1px solid #f59e0b40`, borderRadius: '16px', padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {t.pendingRequests || 'Pending requests'} ({pendingParticipants.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingParticipants.map(pp => {
              const p = pp.profiles
              return (
                <div key={pp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {p?.photo_url
                    ? <img src={p.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.CARD2, color: c.T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>{(p?.name || '?')[0].toUpperCase()}</div>
                  }
                  <div style={{ flex: 1, fontSize: '14px', color: c.T, fontWeight: '500' }}>{p?.name || '?'}</div>
                  <button onClick={() => handleApprove(pp.user_id)} style={{ padding: '6px 12px', background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: '8px', color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>✓</button>
                  <button onClick={() => handleReject(pp.user_id)} style={{ padding: '6px 12px', background: '#ef444420', border: '1px solid #ef444440', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>✗</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action button */}
      {!isOrganizer && (
        <div style={{ marginBottom: '16px' }}>
          {isJoined ? (
            <button onClick={handleLeave} disabled={joining} style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid #ef444440', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600' }}>
              {joining ? '...' : (t.leavePlan || 'Leave plan')}
            </button>
          ) : isPending ? (
            <div style={{ textAlign: 'center', padding: '14px', background: '#f59e0b18', border: '1px solid #f59e0b40', borderRadius: '12px' }}>
              <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>{t.pendingApproval || 'Waiting for approval...'}</span>
            </div>
          ) : (
            <Btn onClick={handleJoin} disabled={joining || isFull} full style={{ padding: '16px', fontSize: '16px' }} c={c}>
              {joining ? '...' : isFull ? (t.planFull || 'Plan is full') : plan.join_mode === JOIN_MODE.OPEN ? (t.joinPlan || 'Join plan') : (t.requestJoin || 'Request to join')}
            </Btn>
          )}
        </div>
      )}

      {/* Share */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank')} style={{ flex: 1, padding: '10px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>WhatsApp</button>
        <button onClick={() => window.open('https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText), '_blank')} style={{ flex: 1, padding: '10px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Telegram</button>
        <button onClick={() => { navigator.clipboard?.writeText(shareUrl); showToast(t.linkCopied || 'Link copied') }} style={{ flex: 1, padding: '10px', background: c.CARD2, color: c.T, border: `1px solid ${c.BD}`, borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>🔗 {t.copyLink || 'Copy'}</button>
      </div>
      {/* Delete (organizer only) */}
      {isOrganizer && (
        <Btn v="danger" full style={{ marginTop: '16px' }} c={c} onClick={async () => {
          if (!window.confirm(t.deletePlanConfirm || 'Delete this plan? This cannot be undone.')) return
          try { await deletePlan(plan.id); showToast(t.deletePlanSuccess || 'Plan deleted'); navigate('/', { replace: true }) }
          catch (e) { console.error('deletePlan:', e); showErr(t.deletePlanError || 'Error deleting plan') }
        }}>{t.deletePlan || 'Delete plan'}</Btn>
      )}
      </>}
    </div>
  )
}
