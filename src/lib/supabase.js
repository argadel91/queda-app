import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://gxkdibhfzjkjxuuhuwfv.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4a2RpYmhmempranh1dWh1d2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzI2MzksImV4cCI6MjA4OTUwODYzOX0.mjxrUTzVjCverPfyKORYuArcq-j07B_kfm6j3MLWev4'

export const db = createClient(SB_URL, SB_KEY)

// Toast error system
let _toastFn = null
export const setToastFn = fn => { _toastFn = fn }
export const showErr = msg => { if (_toastFn) _toastFn(msg); else console.error(msg) }
export const showSuccess = msg => { if (_toastFn) _toastFn(msg, 'success'); }
export const showInfo = msg => { if (_toastFn) _toastFn(msg, 'info'); }

// Plans
export const savePlan = async p => {
  try { await db.from('plans').upsert({ id: p.id, data: p, is_public: !!p.isPublic }) }
  catch (e) { showErr('Error guardando el plan.'); throw e }
}
export const savePlanWithUser = async (p, uid) => {
  try { await db.from('plans').upsert({ id: p.id, data: p, is_public: !!p.isPublic, user_id: uid }) }
  catch (e) {
    console.error('savePlanWithUser failed:', e)
    try { await db.from('plans').upsert({ id: p.id, data: p, is_public: !!p.isPublic }) }
    catch (e2) { showErr('Error guardando el plan.'); throw e2 }
  }
}
export const loadPlan = async id => {
  try { const { data } = await db.from('plans').select('data').eq('id', id).single(); return data?.data || null }
  catch { return null }
}
export const updatePlan = async p => {
  try { await db.from('plans').update({ data: p, is_public: !!p.isPublic }).eq('id', p.id) }
  catch {}
}
export const loadPublicPlans = async () => {
  try {
    const { data } = await db.from('plans').select('data').eq('is_public', true).order('created_at', { ascending: false }).limit(40)
    return (data || []).map(r => r.data)
  } catch { return [] }
}

// Responses
export const saveResp = async (planId, name, resp) => {
  try {
    const { data: ex } = await db.from('responses').select('id').eq('plan_id', planId).eq('name', name).maybeSingle()
    if (ex?.id) { await db.from('responses').update({ data: resp }).eq('id', ex.id) }
    else { await db.from('responses').insert({ plan_id: planId, name, data: resp }) }
  } catch (e) { console.error(e) }
}
export const loadResps = async id => {
  try { const { data } = await db.from('responses').select('data').eq('plan_id', id); return (data || []).map(r => r.data) }
  catch { return [] }
}

// Profiles
export const loadProfile = async uid => {
  try { const { data } = await db.from('profiles').select('*').eq('id', uid).maybeSingle(); return data }
  catch { return null }
}
export const saveProfile = async (uid, prof) => {
  try { await db.from('profiles').upsert({ id: uid, ...prof, updated_at: new Date().toISOString() }) }
  catch (e) { console.error(e) }
}
