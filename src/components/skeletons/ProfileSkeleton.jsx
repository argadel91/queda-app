import React from 'react'
import { theme as t } from '../../theme.js'
import { SkeletonBlock } from './Skeleton.jsx'

export default function ProfileSkeleton() {
  return (
    <div>
      {/* Page heading */}
      <SkeletonBlock width={100} height={26} style={{ marginBottom: 20 }} />

      {/* Trust card */}
      <div style={{ padding: '24px 20px', background: t.bgCard, borderRadius: 14, border: `1px solid ${t.border}`, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <SkeletonBlock width={60} height={12} />
        <SkeletonBlock width={80} height={48} />
        {/* Progress bar */}
        <SkeletonBlock width="100%" height={6} style={{ borderRadius: 999 }} />
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', marginTop: 4 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonBlock width="80%" height={10} />
              <SkeletonBlock width="60%" height={14} />
            </div>
          ))}
        </div>
      </div>

      {/* Profile info card */}
      <div style={{ padding: '16px 18px', background: t.bgCard, borderRadius: 14, border: `1px solid ${t.border}`, marginBottom: 12 }}>
        <SkeletonBlock width={140} height={18} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="90%" height={13} style={{ marginBottom: 4 }} />
        <SkeletonBlock width="70%" height={13} />
      </div>

      {/* Edit button */}
      <SkeletonBlock width="100%" height={42} style={{ borderRadius: 10, marginBottom: 12 }} />

      {/* Recent plans */}
      <SkeletonBlock width={100} height={11} style={{ margin: '16px 0 10px' }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="70%" height={14} style={{ marginBottom: 4 }} />
            <SkeletonBlock width="50%" height={11} />
          </div>
          <SkeletonBlock width={30} height={22} style={{ borderRadius: 999, marginLeft: 12 }} />
        </div>
      ))}
    </div>
  )
}
