import { db } from './supabase.js'

export async function getTrustScore(userId) {
  const { data, error } = await db.rpc('trust_score', { p_user_id: userId })
  if (error) return -1
  return data ?? -1
}

export async function getActivityScore(userId) {
  const { data } = await db.rpc('activity_score', { p_user_id: userId })
  return data ?? 0
}

export async function getSocialScore(userId) {
  const { data } = await db.rpc('social_score', { p_user_id: userId })
  return data ?? 0
}

export async function getRecentPlans(userId, limit = 10) {
  const { data: created } = await db.from('plans')
    .select('id, title, date, status, checked_out_at, auto_checked_out')
    .eq('user_id', userId).order('date', { ascending: false }).limit(limit)

  const { data: joined } = await db.from('plan_participants')
    .select('plan_id, attended, plans(id, title, date, status)')
    .eq('user_id', userId).eq('status', 'joined')
    .order('created_at', { ascending: false }).limit(limit)

  const items = []
  ;(created || []).forEach(p => items.push({ ...p, role: 'organizer' }))
  ;(joined || []).forEach(r => {
    if (r.plans) items.push({ ...r.plans, role: 'attendee', attended: r.attended })
  })
  items.sort((a, b) => b.date?.localeCompare(a.date))
  return items.slice(0, limit)
}

export function formatTrust(score) {
  if (score < 0) return 'New'
  return `${score}%`
}
