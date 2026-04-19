import { useEffect, useState, useCallback } from 'react'
import { db } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function useNotifications() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) { setItems([]); setUnread(0); return }
    try {
      const { data, error: fetchErr } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (fetchErr) throw fetchErr
      setItems(data || [])
      setUnread((data || []).filter(n => !n.read).length)
    } catch (e) {
      setError(e.message || String(e))
    }
  }, [user?.id])

  useEffect(() => {
    load()
    if (!user) return
    const channelName = `notif:${user.id}:${Date.now()}`
    const channel = db.channel(channelName)
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    }, payload => {
      setItems(prev => [payload.new, ...prev].slice(0, 30))
      setUnread(prev => prev + 1)
    })
    channel.subscribe()
    return () => { db.removeChannel(channel) }
  }, [user?.id, load])

  const markRead = useCallback(async (id) => {
    await db.from('notifications').update({ read: true }).eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await db.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }, [user?.id])

  return { items, unread, error, markRead, markAllRead, refresh: load }
}
