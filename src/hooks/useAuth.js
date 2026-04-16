import { useEffect, useState, useCallback } from 'react'
import { db } from '../lib/supabase.js'

// Single source of truth for session + profile.
// Subscribes to supabase auth state and keeps the profile row in sync.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await db.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    let cancelled = false
    db.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => !cancelled && setLoading(false))
    })
    const { data: sub } = db.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await db.auth.signOut()
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  return {
    user: session?.user || null,
    session,
    profile,
    loading,
    needsOnboarding: !!session?.user && !profile,
    signOut,
    refreshProfile,
  }
}
