import React from 'react'
import { theme as t } from '../theme.js'

export default class ErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Report to Sentry if the SDK is available (loaded via CDN or @sentry/react init)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
    }
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const { fallback } = this.props
    if (fallback) return fallback

    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>😵</div>
        <p style={{ color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Something went wrong</p>
        <p style={{ color: t.textDim, fontSize: 13, marginBottom: 16, maxWidth: 280 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: 10,
            padding: '10px 20px', color: t.text, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: t.font,
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
