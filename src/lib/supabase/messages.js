import { db, showErr } from './client.js'

export const fetchMessages = async (planId, limit = 50) => {
  try {
    const { data } = await db.from('messages')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (!data?.length) return []
    const userIds = [...new Set(data.map(m => m.user_id))]
    const { data: profiles } = await db.from('profiles').select('id,name,username,photo_url').in('id', userIds)
    const profMap = {}
    ;(profiles || []).forEach(p => { profMap[p.id] = p })
    return data.map(m => ({ ...m, profiles: profMap[m.user_id] || null }))
  } catch (e) { console.error('fetchMessages:', e); return [] }
}

export const sendMessage = async (planId, userId, content) => {
  try {
    const { error } = await db.from('messages').insert({ plan_id: planId, user_id: userId, content })
    if (error) throw error
  } catch (e) { showErr('Error sending message.'); throw e }
}
