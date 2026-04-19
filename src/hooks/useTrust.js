import { useEffect, useState } from 'react'
import { getTrustScore } from '../lib/trust.js'
import { useAuth } from './useAuth.js'

export function useTrust() {
  const { user } = useAuth()
  const [trust, setTrust] = useState(-1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setTrust(-1); setLoading(false); return }
    let cancelled = false
    getTrustScore(user.id).then(t => {
      if (!cancelled) { setTrust(t); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [user?.id])

  return { trust, loading }
}
