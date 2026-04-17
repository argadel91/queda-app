import React from 'react'
import { theme } from '../theme.js'

export default class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>😵</div>
        <p style={{ color: theme.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Something went wrong</p>
        <p style={{ color: theme.textDim, fontSize: 13, marginBottom: 16 }}>{this.state.error?.message}</p>
        <button onClick={() => this.setState({ error: null })} style={{
          background: theme.bgElev, border: `1px solid ${theme.border}`, borderRadius: 10,
          padding: '10px 20px', color: theme.text, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: theme.font,
        }}>Try again</button>
      </div>
    )
  }
}
