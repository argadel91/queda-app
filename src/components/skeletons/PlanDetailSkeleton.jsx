import React from 'react'
import { theme as t } from '../../theme.js'
import { SkeletonBlock } from './Skeleton.jsx'

export default function PlanDetailSkeleton() {
  return (
    <div>
      {/* Category label */}
      <SkeletonBlock width={120} height={12} style={{ marginBottom: 12 }} />
      {/* Title */}
      <SkeletonBlock width="75%" height={28} style={{ marginBottom: 8 }} />
      {/* Organizer line */}
      <SkeletonBlock width={160} height={14} style={{ marginBottom: 24 }} />

      {/* Info card */}
      <div style={{ padding: '16px 18px', background: t.bgCard, borderRadius: 14, border: `1px solid ${t.border}`, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 4 ? 14 : 0 }}>
            <SkeletonBlock width={20} height={20} style={{ flexShrink: 0, borderRadius: 4 }} />
            <SkeletonBlock width={`${50 + i * 10}%`} height={16} />
          </div>
        ))}
      </div>

      {/* Action button */}
      <SkeletonBlock width="100%" height={48} style={{ borderRadius: 10, marginBottom: 24 }} />

      {/* Attendees section */}
      <SkeletonBlock width={100} height={12} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
          <SkeletonBlock width={120} height={14} />
          <SkeletonBlock width={60} height={14} />
        </div>
      ))}
    </div>
  )
}
