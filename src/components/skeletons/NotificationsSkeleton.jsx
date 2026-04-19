import React from 'react'
import { theme as t } from '../../theme.js'
import { SkeletonBlock } from './Skeleton.jsx'

export default function NotificationsSkeleton() {
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SkeletonBlock width={140} height={26} />
        <SkeletonBlock width={90} height={14} />
      </div>

      {/* Notification rows */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${t.border}`, alignItems: 'center' }}>
          {/* Icon circle */}
          <SkeletonBlock width={36} height={36} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={`${55 + (i % 3) * 15}%`} height={14} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="60%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonBlock width={50} height={11} />
          </div>
          {/* Unread dot placeholder */}
          <SkeletonBlock width={8} height={8} style={{ borderRadius: '50%', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
