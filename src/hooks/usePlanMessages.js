import { useEffect, useState, useCallback } from 'react'
import { db } from '../lib/supabase.js'

export function usePlanMessages(planId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!planId) return
    try {
      const { data, error: fetchErr } = await db
        .from('messages')
        .select('id, body, created_at, user_id, profiles(username)')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true })
        .limit(100)
      if (fetchErr) throw fetchErr
      setMessages(data || [])
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    load()
    if (!planId) return
    const channel = db.channel(`messages:${planId}:${Date.now()}`)
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `plan_id=eq.${planId}`,
    }, async payload => {
      const { data } = await db
        .from('messages')
        .select('id, body, created_at, user_id, profiles(username)')
        .eq('id', payload.new.id)
        .maybeSingle()
      if (data) setMessages(prev => [...prev, data])
    })
    channel.subscribe()
    return () => { db.removeChannel(channel) }
  }, [planId, load])

  const send = useCallback(async (userId, body) => {
    const text = body.trim()
    if (!text || !userId) return
    const optimistic = {
      id: `opt-${Date.now()}`,
      plan_id: planId,
      user_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      profiles: null,
      _pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    const { error: insertErr } = await db
      .from('messages')
      .insert({ plan_id: planId, user_id: userId, body: text })
    if (insertErr) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      throw new Error(insertErr.message)
    }
    // Real row will arrive via realtime; remove optimistic copy
    setMessages(prev => prev.filter(m => m.id !== optimistic.id))
  }, [planId])

  return { messages, loading, error, send }
}
