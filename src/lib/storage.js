export const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
}
export const getMyPlans = () => ls.get('q_plans', [])
export const addMyPlan = (id, name, role) => {
  const p = getMyPlans().filter(x => x.id !== id)
  ls.set('q_plans', [{ id, name, role, at: new Date().toISOString() }, ...p].slice(0, 40))
}
