import React from 'react'

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function IconCompass({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} strokeWidth={3}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}

export function IconCalendar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}

export function IconBell({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
}

export function TokenDot() {
  return (
    <span style={{
      width: 10, height: 10, borderRadius: 999, flexShrink: 0,
      background: 'linear-gradient(135deg, #CDFF6C 0%, #7BF5A5 100%)',
      boxShadow: '0 0 6px rgba(205,255,108,0.6)',
    }} />
  )
}

export const AVATAR_COLORS = ['#CDFF6C', '#FFB36B', '#6BC5FF', '#FF6068', '#C4B5FD']
