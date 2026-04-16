import React from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../theme.js'
import { AuthShell } from './Signup.jsx'

// Placeholder page. With email+password this is where Supabase email confirmation
// links land. Keep the route so that future WhatsApp OTP can reuse it
// (inputs for code digits, verifyOtp call, etc.).
export default function Verify() {
  return (
    <AuthShell title="Verify your account">
      <p style={{ color: theme.textDim, fontSize: 14, lineHeight: 1.5 }}>
        Open the confirmation link we sent to your email, then log in.
      </p>
      <p style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/login" style={{ color: theme.accent, fontSize: 14 }}>Back to login</Link>
      </p>
    </AuthShell>
  )
}
