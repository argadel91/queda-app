import { useState, useEffect, useRef } from 'react'
import { db, fetchMessages, sendMessage as sendMsg } from '../lib/supabase.js'

export default function useRealtimeChat(planId, userId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const profileCache = useRef({})
  const hadError = useRef(false)

  const loadMessages = () => {
    return fetchMessages(planId).then(msgs => {
      setMessages(msgs)
      msgs.forEach(m => { if (m.profiles) profileCache.current[m.user_id] = m.profiles })
    })
  }

  // Load initial messages
  useEffect(() => {
    if (!planId) return
    setLoading(true)
    loadMessages().then(() => setLoading(false))
  }, [planId])

  // Realtime subscription
  useEffect(() => {
    if (!planId) return
    const channel = db.channel('chat-' + planId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `plan_id=eq.${planId}`
      }, async payload => {
        const msg = payload.new
        let prof = profileCache.current[msg.user_id]
        if (!prof) {
          const { data } = await db.from('profiles').select('id,name,username,photo_url').eq('id', msg.user_id).maybeSingle()
          prof = data
          if (prof) profileCache.current[msg.user_id] = prof
        }
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, { ...msg, profiles: prof }]
        })
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          hadError.current = true
          setReconnecting(true)
        } else if (status === 'SUBSCRIBED' && hadError.current) {
          hadError.current = false
          setReconnecting(false)
          loadMessages()
        }
      })

    return () => { db.removeChannel(channel) }
  }, [planId])

  const sendMessage = async (content) => {
    if (!content?.trim() || !userId || !planId) return
    await sendMsg(planId, userId, content.trim())
  }

  return { messages, loading, reconnecting, sendMessage }
}
