import { db, showErr } from './client.js'
import { PLAN_STATUS } from '../../constants/status.js'

export const createPlan = async (plan) => {
  try {
    const { error } = await db.from('plans').insert(plan)
    if (error) throw error
  } catch (e) { showErr('Error creating plan.'); throw e }
}

export const fetchPlan = async id => {
  try {
    const { data } = await db.from('plans').select('*').eq('id', id).maybeSingle()
    if (!data) return null
    const { data: prof } = await db.from('profiles').select('id,name,username,photo_url,birthdate,city').eq('id', data.user_id).maybeSingle()
    return { ...data, profiles: prof }
  } catch (e) { console.error('fetchPlan:', e); return null }
}

export const fetchPlans = async ({ category, dateFrom, dateTo, lat, lng, radiusKm, limit = 20, offset = 0 } = {}) => {
  try {
    let q = db.from('plans')
      .select('*, profiles:user_id(id,name,username,photo_url,birthdate,city), plan_participants(count)', { count: 'exact' })
      .in('status', [PLAN_STATUS.ACTIVE, PLAN_STATUS.FULL])
      .gte('date', new Date().toISOString().slice(0, 10))

      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .range(offset, offset + limit - 1)

    if (category) q = q.eq('category', category)
    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)
    if (lat != null && lng != null && radiusKm) {
      const latDelta = radiusKm / 111
      const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
      q = q.gte('lat', lat - latDelta).lte('lat', lat + latDelta).gte('lng', lng - lngDelta).lte('lng', lng + lngDelta)
    }

    const { data, count } = await q
    if (!data?.length) return { plans: [], total: 0 }

    const plans = data.map(p => ({
      ...p,
      participant_count: p.plan_participants?.[0]?.count || 0,
      profiles: p.profiles || null,
      plan_participants: undefined
    }))

    return { plans, total: count || 0 }
  } catch (e) { console.error('fetchPlans:', e); return { plans: [], total: 0 } }
}

export const updatePlan = async (id, fields) => {
  try {
    const { error } = await db.from('plans').update(fields).eq('id', id)
    if (error) throw error
  } catch (e) { showErr('Error updating plan.'); throw e }
}

export const deletePlan = async (planId) => {
  const { error } = await db.rpc('delete_plan', { p_plan_id: planId })
  if (error) throw error
}

export const fetchMyPlans = async (userId) => {
  try {
    const { data } = await db.from('plans')
      .select('*, profiles:user_id(id,name,username,photo_url,birthdate,city), plan_participants(count)')
      .eq('user_id', userId)

      .order('date', { ascending: false })
    if (!data?.length) return []
    return data.map(p => ({ ...p, participant_count: p.plan_participants?.[0]?.count || 0, profiles: p.profiles || null, plan_participants: undefined }))
  } catch (e) { console.error('fetchMyPlans:', e); return [] }
}

export const fetchJoinedPlans = async (userId) => {
  try {
    // Get plan IDs where user is a joined participant (but not organizer)
    const { data: pp } = await db.from('plan_participants').select('plan_id').eq('user_id', userId).eq('status', 'joined')
    if (!pp?.length) return []
    const planIds = pp.map(p => p.plan_id)
    const { data } = await db.from('plans')
      .select('*, profiles:user_id(id,name,username,photo_url,birthdate,city), plan_participants(count)')
      .in('id', planIds)
      .neq('user_id', userId)

      .order('date', { ascending: false })
    if (!data?.length) return []
    return data.map(p => ({ ...p, participant_count: p.plan_participants?.[0]?.count || 0, profiles: p.profiles || null, plan_participants: undefined }))
  } catch (e) { console.error('fetchJoinedPlans:', e); return [] }
}
