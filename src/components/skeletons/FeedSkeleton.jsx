import React from 'react'
import { theme as t } from '../../theme.js'
import { SkeletonBlock, SkeletonText } from './Skeleton.jsx'

export default function FeedSkeleton() {
  return (
    <div>
      {/* Category pills row */}
      <div style={{ display: 'flex', gap: 8, paddingBottom: 20 }}>
        {[60, 80, 70, 90, 65].map((w, i) => (
          <SkeletonBlock key={i} width={w} height={32} style={{ borderRadius: 999, flexShrink: 0 }} />
        ))}
      </div>

      {/* Hero card */}
      <div style={{ padding: '22px 20px', background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: 14, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <SkeletonBlock width={90} height={14} />
          <SkeletonBlock width={40} height={14} />
        </div>
        <SkeletonBlock width="80%" height={40} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
          <div>
            <SkeletonBlock width={40} height={10} style={{ marginBottom: 6 }} />
            <SkeletonBlock width={60} height={20} />
          </div>
          <div>
            <SkeletonBlock width={50} height={10} style={{ marginBottom: 6 }} />
            <SkeletonBlock width={100} height={20} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: -8 }}>
            {[0, 1, 2].map(i => (
              <SkeletonBlock key={i} width={28} height={28} style={{ borderRadius: 999, marginLeft: i === 0 ? 0 : -8 }} />
            ))}
          </div>
          <SkeletonBlock width={80} height={36} style={{ borderRadius: 999 }} />
        </div>
      </div>

      {/* Plan list rows */}
      <SkeletonBlock width={120} height={12} style={{ margin: '28px 0 16px' }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: 18, padding: '18px 0', borderBottom: `1px solid ${t.border}`, alignItems: 'center' }}>
          <div style={{ flexShrink: 0, width: 48 }}>
            <SkeletonBlock width={48} height={12} style={{ marginBottom: 4 }} />
            <SkeletonBlock width={48} height={18} />
          </div>
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="70%" height={20} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
