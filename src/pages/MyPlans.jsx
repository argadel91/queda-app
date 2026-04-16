import React from 'react'
import { theme } from '../theme.js'

export default function MyPlans() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>My plans</h1>
      <p style={{ color: theme.textDim, fontSize: 14 }}>Nothing to show yet.</p>
    </div>
  )
}
