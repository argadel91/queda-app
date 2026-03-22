const cache = new Map()
const TTL = 60 * 60 * 1000 // 1 hour

export const cached = async (key, fetchFn) => {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < TTL) return entry.data
  const data = await fetchFn()
  cache.set(key, { data, ts: Date.now() })
  return data
}
