import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// Google Maps loader — only loads when first needed
window.__loadGoogleMaps = () => {
  if (window.__gmLoading || window.google?.maps) return
  window.__gmLoading = true
  const gmKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
  if (!gmKey) return
  window.__gmKey = gmKey
  const s = document.createElement('script')
  s.src = `https://maps.googleapis.com/maps/api/js?key=${gmKey}&loading=async&libraries=places&v=weekly`
  s.async = true
  document.head.appendChild(s)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
