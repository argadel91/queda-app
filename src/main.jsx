import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// Load Google Maps dynamically with async bootstrap
const gmKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
if (gmKey && !document.querySelector('script[src*="maps.googleapis.com"]')) {
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
