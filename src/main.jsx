import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'

// Sentry — error tracking (production only)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    sampleRate: 1.0,
    // No performance monitoring (keeps bundle small)
    tracesSampleRate: 0,
    // No session replay (privacy)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={({error})=>(
    <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#F0EBE1',fontFamily:'system-ui',padding:'24px',textAlign:'center'}}>
      <div style={{fontSize:'48px',marginBottom:'16px'}}>😵</div>
      <h1 style={{fontSize:'22px',fontWeight:'800',marginBottom:'8px'}}>Something went wrong</h1>
      <p style={{fontSize:'14px',color:'#888',marginBottom:'20px',maxWidth:'300px'}}>{error?.message||'An unexpected error occurred'}</p>
      <button onClick={()=>window.location.reload()} style={{padding:'12px 24px',background:'#CDFF6C',color:'#0A0A0A',border:'none',borderRadius:'12px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>Reload</button>
    </div>
  )}>
    <App />
  </Sentry.ErrorBoundary>
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
