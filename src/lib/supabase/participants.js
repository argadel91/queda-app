import { db, showErr } from './client.js'
import { JOIN_STATUS } from '../../constants/status.js'

export const fetchParticipants = async planId => {
  try {
    const { data } = await db.from('plan_participants').select('*').eq('plan_id', planId)
    if (!data?.length) return []
    const userIds = data.map(p => p.user_id)
    const { data: profiles } = await db.from('profiles').select('id,name,username,photo_url,birthdate,city').in('id', userIds)
    const profMap = {}
    ;(profiles || []).forEach(p => { profMap[p.id] = p })
    return data.map(p => ({ ...p, profiles: profMap[p.user_id] || null }))
  } catch (e) { console.error('fetchParticipants:', e); return [] }
}

export const joinPlan = async (planId, userId) => {
  const { error } = await db.rpc('join_plan', { p_plan_id: planId, p_user_id: userId, p_status: JOIN_STATUS.JOINED })
  if (error) throw error
}

export const requestJoin = async (planId, userId) => {
  const { error } = await db.rpc('join_plan', { p_plan_id: planId, p_user_id: userId, p_status: JOIN_STATUS.PENDING })
  if (error) throw error
}

export const updateParticipant = async (planId, userId, status) => {
  try {
    const { error } = await db.from('plan_participants').update({ status }).eq('plan_id', planId).eq('user_id', userId)
    if (error) throw error
  } catch (e) { showErr('Error updating participant.'); throw e }
}

export const leavePlan = async (planId, userId) => {
  try {
    const { error } = await db.from('plan_participants').delete().eq('plan_id', planId).eq('user_id', userId)
    if (error) throw error
  } catch (e) { showErr('Error leaving plan.'); throw e }
}
