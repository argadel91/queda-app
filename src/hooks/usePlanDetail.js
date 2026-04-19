import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function usePlanDetail(id) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [organizer, setOrganizer] = useState(null)
  const [joined, setJoined] = useState([])
  const [pending, setPending] = useState([])
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [attendance, setAttendance] = useState({})

  const load = useCallback(async () => {
    try {
      const { data: p, error: planErr } = await db.from('plans').select('*').eq('id', id).maybeSingle()
      if (planErr) throw planErr
      if (!p) return
      setPlan(p)
      // Instrument view — fire-and-forget, errors must not break UX
      if (user?.id) {
        db.from('user_interactions').insert({
          user_id: user.id, plan_id: id,
          interaction_type: 'view', created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {})
      }
      const [{ data: org, error: orgErr }, { data: parts, error: partsErr }, { data: orgTrust }] = await Promise.all([
        db.from('profiles').select('id, username, gender, birthdate').eq('id', p.user_id).maybeSingle(),
        db.from('plan_participants').select('user_id, status, profiles(username, gender)').eq('plan_id', id).in('status', ['joined', 'pending']),
        db.rpc('trust_score', { p_user_id: p.user_id }),
      ])
      if (orgErr) throw orgErr
      if (partsErr) throw partsErr
      setOrganizer(org ? { ...org, trust: orgTrust ?? -1 } : null)
      const j = (parts || []).filter(x => x.status === 'joined')
      setJoined(j)
      setPending((parts || []).filter(x => x.status === 'pending'))
      setMyStatus((parts || []).find(x => x.user_id === user?.id)?.status || null)
      setAttendance(prev => {
        const next = {}
        j.forEach(x => { next[x.user_id] = prev[x.user_id] ?? true })
        return next
      })
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => { load() }, [load])

  const act = useCallback(async (fn) => {
    setBusy(true); setErr('')
    try { await fn(); await load() }
    catch (e) { setErr(e.message || String(e)) }
    setBusy(false)
  }, [load])

  const rpc = async (fn, params) => {
    const { error } = await db.rpc(fn, params)
    if (error) throw new Error(error.message)
  }

  const join = useCallback(() =>
    act(() => rpc('join_plan_free', { p_plan_id: id, p_user_id: user.id })),
    [act, id, user?.id])

  const leave = useCallback(() =>
    act(() => rpc('leave_plan', { p_plan_id: id, p_user_id: user.id })),
    [act, id, user?.id])

  const cancel = useCallback(() =>
    act(async () => {
      await rpc('cancel_plan', { p_plan_id: id, p_user_id: user.id })
      navigate('/', { replace: true })
    }),
    [act, id, user?.id, navigate])

  const approve = useCallback(uid =>
    act(async () => {
      const { error } = await db.from('plan_participants').update({ status: 'joined' }).eq('plan_id', id).eq('user_id', uid)
      if (error) throw new Error(error.message)
    }),
    [act, id])

  const reject = useCallback(uid =>
    act(() => rpc('reject_join_request', { p_organizer_id: user.id, p_plan_id: id, p_user_id: uid })),
    [act, id, user?.id])

  const finalise = useCallback(() =>
    act(async () => {
      for (const [uid, attended] of Object.entries(attendance)) {
        await db.from('plan_participants').update({ attended }).eq('plan_id', id).eq('user_id', uid)
      }
      const { error } = await db.rpc('process_plan_checkout', { p_plan_id: id, p_organizer_id: user.id, p_auto: false })
      if (error) throw error
    }),
    [act, attendance, id, user?.id])

  return {
    plan,
    organizer,
    joined,
    pending,
    myStatus,
    loading,
    busy,
    err,
    setErr,
    attendance,
    setAttendance,
    refresh: load,
    actions: { join, leave, cancel, approve, reject, finalise },
  }
}
