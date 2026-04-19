import React, { useRef, useState } from 'react'
import { usePlanMessages } from '../../hooks/usePlanMessages.js'
import { theme as t } from '../../theme.js'
import { AVATAR_COLORS } from '../Icons.jsx'

const avatarColor = uid => AVATAR_COLORS[(uid?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function PlanComments({ planId, user, isParticipant }) {
  const { messages, loading, error, send } = usePlanMessages(planId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const listRef = useRef(null)

  const handleSend = async e => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSendErr('')
    setSending(true)
    try {
      await send(user?.id, draft)
      setDraft('')
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    } catch (err) {
      setSendErr(err.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontFamily: t.fontHead, fontSize: 16, fontWeight: 800, letterSpacing: -0.3, marginBottom: 12 }}>
        Comments
      </h2>

      {loading && (
        <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Loading…</p>
      )}
      {error && (
        <p role="alert" style={{ color: t.danger, fontSize: 13, marginBottom: 8 }}>{error}</p>
      )}

      {!loading && messages.length === 0 && (
        <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          No comments yet. Be the first!
        </p>
      )}

      {messages.length > 0 && (
        <div
          ref={listRef}
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 12,
            padding: '4px 0',
          }}
        >
          {messages.map(m => {
            const isMe = m.user_id === user?.id
            const username = m.profiles?.username || '?'
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  gap: 8,
                  alignItems: 'flex-end',
                  opacity: m._pending ? 0.6 : 1,
                }}
              >
                {!isMe && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(m.user_id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: t.accentInk,
                  }}>
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: '72%' }}>
                  {!isMe && (
                    <div style={{ fontSize: 10, color: t.textDim, marginBottom: 2, paddingLeft: 2 }}>{username}</div>
                  )}
                  <div style={{
                    background: isMe ? t.accentSoft : t.bgCard,
                    border: `1px solid ${isMe ? 'rgba(205,255,108,0.25)' : t.border}`,
                    borderRadius: 12,
                    borderBottomRightRadius: isMe ? 4 : 12,
                    borderBottomLeftRadius: isMe ? 12 : 4,
                    padding: '8px 12px',
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: t.text,
                    wordBreak: 'break-word',
                  }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: t.textDim, marginTop: 2, textAlign: isMe ? 'right' : 'left', paddingLeft: 2, paddingRight: 2 }}>
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isParticipant && user && (
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            id="comment-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a comment…"
            rows={1}
            aria-label="Write a comment"
            style={{
              flex: 1,
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: '10px 12px',
              color: t.text,
              fontSize: 13,
              fontFamily: t.font,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.4,
            }}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send comment"
            style={{
              background: draft.trim() ? t.gradient : t.bgCard,
              color: draft.trim() ? t.accentInk : t.textDim,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: draft.trim() ? 'pointer' : 'default',
              fontFamily: t.font,
              flexShrink: 0,
              transition: 'background 150ms ease',
            }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      )}

      {sendErr && (
        <p role="alert" style={{ color: t.danger, fontSize: 12, marginTop: 6 }}>{sendErr}</p>
      )}

      {!isParticipant && user && (
        <p style={{ color: t.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          Join the plan to comment.
        </p>
      )}
    </div>
  )
}
