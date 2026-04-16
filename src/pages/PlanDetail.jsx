import React from 'react'
import { useParams } from 'react-router-dom'
import { theme } from '../theme.js'

export default function PlanDetail() {
  const { id } = useParams()
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 16px' }}>Plan</h1>
      <p style={{ color: theme.textDim, fontSize: 13 }}>ID: {id}</p>
    </div>
  )
}
