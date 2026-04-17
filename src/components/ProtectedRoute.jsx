import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { theme as t } from '../theme.js'

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { user, profile, loading, needsOnboarding } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, color: t.textDim }}>
        …
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (requireProfile && needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return children
}
