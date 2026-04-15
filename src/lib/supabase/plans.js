import { db, showErr } from './client.js'
import { PLAN_STATUS } from '../../constants/status.js'

// Helper: fetch participant counts for a list of plan IDs
async function getParticipantCounts(planIds) {
  if (!planIds.length) return {}
  const { data } = await db.from('plan_participants').select('plan_id').in('plan_id', planIds).eq('status', 'joined')
  const counts = {}
  ;(data || []).forEach(p => { counts[p.plan_id] = (counts[p.plan_id] || 0) + 1 })
  return counts
}

// Helper: fetch organizer profiles for a list of plans
async function getOrganizerProfiles(plans) {
  if (!plans.length) return {}
  const userIds = [...new Set(plans.map(p => p.user_id))]
  const { data } = await db.from('profiles').select('id,name,username,photo_url,birthdate,city').in('id', userIds)
  const map = {}
  ;(data || []).forEach(p => { map[p.id] = p })
  return map
}

// Helper: enrich plans with profiles and participant counts
async function enrichPlans(plans) {
  if (!plans.length) return []
  const [counts, profMap] = await Promise.all([
    getParticipantCounts(plans.map(p => p.id)),
    getOrganizerProfiles(plans)
  ])
  return plans.map(p => ({ ...p, participant_count: counts[p.id] || 0, profiles: profMap[p.user_id] || null }))
}

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
      .select('*', { count: 'exact' })
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

    const plans = await enrichPlans(data)
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

export const fetchUpcomingPlans = async (userId) => {
  try {
    // 1. Plans I organized
    const { data: myData } = await db.from('plans').select('*').eq('user_id', userId).order('date', { ascending: true })
    const myPlans = (myData || []).map(p => ({ ...p, _role: 'organizer' }))

    // 2. Plans I joined (not organizer)
    const { data: pp } = await db.from('plan_participants').select('plan_id').eq('user_id', userId).eq('status', 'joined')
    let joinedPlans = []
    if (pp?.length) {
      const joinedIds = pp.map(p => p.plan_id).filter(id => !myPlans.some(m => m.id === id))
      if (joinedIds.length) {
        const { data: jData } = await db.from('plans').select('*').in('id', joinedIds).order('date', { ascending: true })
        joinedPlans = (jData || []).map(p => ({ ...p, _role: 'joined' }))
      }
    }

    // Combine, sort by date asc
    const all = [...myPlans, ...joinedPlans].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
    return enrichPlans(all)
  } catch (e) { console.error('fetchUpcomingPlans:', e); return [] }
}

export const fetchRequestPlans = async (userId) => {
  try {
    const { data: pp } = await db.from('plan_participants').select('plan_id, status').eq('user_id', userId).in('status', ['pending', 'rejected'])
    if (!pp?.length) return []
    const statusMap = {}
    pp.forEach(p => { statusMap[p.plan_id] = p.status })
    const planIds = pp.map(p => p.plan_id)
    const { data } = await db.from('plans').select('*').in('id', planIds).order('date', { ascending: false })
    if (!data?.length) return []
    const enriched = await enrichPlans(data)
    return enriched.map(p => ({ ...p, _requestStatus: statusMap[p.id] || 'pending' }))
  } catch (e) { console.error('fetchRequestPlans:', e); return [] }
}
