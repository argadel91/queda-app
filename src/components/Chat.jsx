import React, { useState, useRef, useEffect } from 'react'
import T from '../constants/translations.js'
import useRealtimeChat from '../hooks/useRealtimeChat.js'

export default function Chat({ planId, userId, c, lang }) {
  const t = T[lang] || T.en
  const { messages, loading, reconnecting, sendMessage } = useRealtimeChat(planId, userId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const listRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const msg = text.trim()
    setText('')
    await sendMessage(msg)
    setSending(false)
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const formatDateSep = (iso) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const LOC = { es: 'es-ES', en: 'en-GB', pt: 'pt-PT', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }
    if (d.toDateString() === today.toDateString()) return t.chatToday || 'Today'
    if (d.toDateString() === yesterday.toDateString()) return t.chatYesterday || 'Yesterday'
    return d.toLocaleDateString(LOC[lang] || 'en-GB', { day: 'numeric', month: 'short' })
  }

  // Group messages by date
  let lastDate = null

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: c.M }}>
      <div style={{ width: '20px', height: '20px', border: `2px solid ${c.BD}`, borderTop: `2px solid ${c.A}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
      {reconnecting && (
        <div style={{ padding: '6px 12px', background: '#f59e0b18', borderBottom: `1px solid ${c.BD}`, textAlign: 'center', fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
          {t.chatReconnecting || 'Reconnecting...'}
        </div>
      )}
      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: c.M, fontSize: '13px' }}>
            {t.chatNoMessages || 'No messages yet. Be the first!'}
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.user_id === userId
          const prof = msg.profiles
          const msgDate = new Date(msg.created_at).toDateString()
          let showDateSep = false
          if (msgDate !== lastDate) { showDateSep = true; lastDate = msgDate }

          // Show avatar only if different user from previous message
          const prevMsg = messages[i - 1]
          const showAvatar = !isMine && (!prevMsg || prevMsg.user_id !== msg.user_id || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString())

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px', color: c.M2, fontWeight: '600' }}>
                  {formatDateSep(msg.created_at)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                {!isMine && (
                  <div style={{ width: '28px', flexShrink: 0 }}>
                    {showAvatar && (
                      prof?.photo_url
                        ? <img src={prof.photo_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.CARD2, color: c.T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{(prof?.name || '?')[0].toUpperCase()}</div>
                    )}
                  </div>
                )}
                <div style={{ maxWidth: '75%' }}>
                  {showAvatar && !isMine && (
                    <div style={{ fontSize: '11px', color: c.A, fontWeight: '600', marginBottom: '2px', marginLeft: '8px' }}>{prof?.name || '?'}</div>
                  )}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? c.A : c.CARD2,
                    color: isMine ? '#0A0A0A' : c.T,
                    fontSize: '14px', lineHeight: 1.4,
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                    <span style={{ fontSize: '10px', color: isMine ? '#0A0A0A80' : c.M2, marginLeft: '8px', whiteSpace: 'nowrap' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${c.BD}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 1000))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={t.chatPlaceholder || 'Type a message...'}
          maxLength={1000}
          style={{ flex: 1, background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '20px', padding: '10px 16px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: text.trim() ? c.A : c.CARD2,
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', transition: 'background .15s'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
