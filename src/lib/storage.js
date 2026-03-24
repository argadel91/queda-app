import { db } from './supabase.js'

export const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
}

export const getMyPlans = () => ls.get('q_plans', [])

export const addMyPlan = (id, name, role) => {
  const p = getMyPlans().filter(x => x.id !== id)
  ls.set('q_plans', [{ id, name, role, at: new Date().toISOString() }, ...p].slice(0, 40))
  // Sync to Supabase (fire and forget)
  db.auth.getUser().then(({ data }) => {
    if (data?.user) {
      db.from('user_plans').upsert({ user_id: data.user.id, plan_id: id, role }, { onConflict: 'user_id,plan_id' }).then(() => {})
    }
  }).catch(() => {})
}

export const removeMyPlan = (id) => {
  ls.set('q_plans', getMyPlans().filter(x => x.id !== id))
  db.auth.getUser().then(({ data }) => {
    if (data?.user) {
      db.from('user_plans').delete().eq('user_id', data.user.id).eq('plan_id', id).then(() => {})
    }
  }).catch(() => {})
}

// Sync from Supabase → merge with localStorage (called on login)
export const syncMyPlans = async (userId) => {
  try {
    const { data } = await db.from('user_plans').select('plan_id, role, created_at').eq('user_id', userId)
    if (!data) return
    const local = getMyPlans()
    const merged = [...local]
    for (const remote of data) {
      if (!merged.find(x => x.id === remote.plan_id)) {
        merged.push({ id: remote.plan_id, name: '', role: remote.role, at: remote.created_at })
      }
    }
    // Also push local-only plans to Supabase
    for (const loc of local) {
      if (!data.find(x => x.plan_id === loc.id)) {
        db.from('user_plans').upsert({ user_id: userId, plan_id: loc.id, role: loc.role || 'invited' }, { onConflict: 'user_id,plan_id' }).catch(() => {})
      }
    }
    ls.set('q_plans', merged.slice(0, 40))
  } catch {}
}
