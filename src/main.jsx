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
  const rawLang = localStorage.getItem('q_lang') ? JSON.parse(localStorage.getItem('q_lang')) : (navigator.language||'en').slice(0,2)
  const allowedLangs = ['es','en','pt','fr','de','it']
  const lang = allowedLangs.includes(rawLang) ? rawLang : 'en'
  s.src = `https://maps.googleapis.com/maps/api/js?key=${gmKey}&libraries=places,geometry&v=weekly&language=${lang}&callback=__gmReady`
  window.__gmReady = () => { window.__gmLoaded = true; }
  s.async = true
  document.head.appendChild(s)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
