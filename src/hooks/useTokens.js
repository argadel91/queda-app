import { useEffect, useState } from 'react'
import { useAuth } from './useAuth.js'
import { getTokenBalance, getTokenHistory, subscribeToBalance } from '../lib/tokens.js'

export function useTokens() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) { setBalance(null); setHistory([]); setLoading(false); return }
    let cancelled = false
    setLoading(true); setError(null)
    Promise.all([getTokenBalance(user.id), getTokenHistory(user.id, 50)])
      .then(([b, h]) => {
        if (cancelled) return
        setBalance(b)
        setHistory(h)
      })
      .catch(e => !cancelled && setError(e.message || String(e)))
      .finally(() => !cancelled && setLoading(false))

    const unsub = subscribeToBalance(user.id, row => {
      setBalance(row.balance_after)
      setHistory(prev => [row, ...prev].slice(0, 50))
    })
    return () => { cancelled = true; unsub() }
  }, [user?.id])

  return { balance, history, loading, error }
}
