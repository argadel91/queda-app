/**
 * Base skeleton block. Uses a CSS keyframe animation defined in index.css.
 * If the project ever adopts Tailwind, replace with `animate-pulse bg-gray-700`.
 */
import React from 'react'
import { theme as t } from '../../theme.js'

// Inject the pulse keyframe once when this module loads
if (typeof document !== 'undefined') {
  const id = '__skeleton_style__'
  if (!document.getElementById(id)) {
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .skeleton-pulse {
        animation: skeleton-pulse 1.5s ease-in-out infinite;
        border-radius: 6px;
        background: ${t.bgElev};
        border: 1px solid ${t.border};
      }
    `
    document.head.appendChild(style)
  }
}

export function SkeletonBlock({ width = '100%', height = 16, style = {} }) {
  return (
    <div
      className="skeleton-pulse"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  )
}

export function SkeletonText({ lines = 1, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 && lines > 1 ? '65%' : '100%'} height={14} />
      ))}
    </div>
  )
}
