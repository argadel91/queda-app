import React, { useEffect, useState } from 'react'
import { theme as t } from '../theme.js'

const STORAGE_KEY = 'queda.installDismissed'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const { at } = JSON.parse(raw)
    return Date.now() - at < EXPIRY_MS
  } catch {
    return false
  }
}

function setDismissed() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() })) } catch { /* ignore */ }
}

export default function InstallPrompt({ isAuthed }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isAuthed || isDismissed()) return
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isAuthed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 80, // above bottom nav
        left: 16,
        right: 16,
        zIndex: 1000,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>Install queda</div>
        <div style={{ fontSize: 12, color: t.textDim, lineHeight: 1.4 }}>Add to your home screen for a faster experience.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          style={{
            background: 'none', border: `1px solid ${t.border}`,
            borderRadius: t.radiusSm, padding: '7px 12px',
            color: t.textDim, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: t.font,
          }}
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            background: t.gradient, border: 'none',
            borderRadius: t.radiusSm, padding: '7px 14px',
            color: t.accentInk, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: t.font,
          }}
        >
          Install
        </button>
      </div>
    </div>
  )
}
