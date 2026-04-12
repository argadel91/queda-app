import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import T from './constants/translations.js'
import { C, getSysTheme, applyTheme } from './constants/theme.js'
import { db, setToastFn } from './lib/supabase.js'
import { authSignOut, getSession } from './lib/auth.js'
import { saveProfile, loadProfile } from './lib/supabase.js'
import { ls } from './lib/storage.js'
import { AppProvider } from './context/AppContext.jsx'
import BottomNav from './components/BottomNav.jsx'

import Landing from './pages/Landing.jsx'

const AuthScreen = React.lazy(() => import('./pages/AuthScreen.jsx'))
const ResetPasswordScreen = React.lazy(() => import('./pages/ResetPasswordScreen.jsx'))
const Profile = React.lazy(() => import('./pages/Profile.jsx'))
const Create = React.lazy(() => import('./pages/Create.jsx'))
const Feed = React.lazy(() => import('./pages/Feed.jsx'))
const PlanDetail = React.lazy(() => import('./pages/PlanDetail.jsx'))
const MapFeed = React.lazy(() => import('./pages/MapFeed.jsx'))
const PublicProfile = React.lazy(() => import('./pages/PublicProfile.jsx'))

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState(() => ls.get('q_theme', null) || getSysTheme())
  const [lang, setLang] = useState(() => {
    const saved = ls.get('q_lang', null)
    if (saved) return saved
    const bl = (navigator.language || 'es').slice(0, 2).toLowerCase()
    const supported = ['es', 'en', 'pt', 'fr', 'de', 'it']
    return supported.includes(bl) ? bl : 'es'
  })
  const [toast, setToast] = useState(null)
  const [langOpen, setLangOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const c = useMemo(() => C(theme), [theme])

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { setToastFn((msg, type = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }) }, [])

  useEffect(() => {
    const off = () => setToast({ msg: T[lang]?.offlineMsg || 'No internet connection', type: 'error' })
    const on = () => setToast({ msg: T[lang]?.onlineMsg || 'Back online', type: 'success' })
    window.addEventListener('offline', off); window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [lang])

  const tgTheme = () => setTheme(t => { const n = t === 'dark' ? 'light' : 'dark'; applyTheme(n); ls.set('q_theme', n); return n })

  // Auth
  useEffect(() => {
    let cancelled = false

    const initAuth = async () => {
      // Handle OAuth callback — wait for exchange before anything else
      if (window.location.pathname === '/auth/callback') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('code')) {
          try { await db.auth.exchangeCodeForSession(params.get('code')) } catch (e) { console.error('exchangeCode:', e) }
        }
        navigate('/', { replace: true })
        return
      }

      // Handle password reset — user arrives at /reset-password with token in hash
      // Supabase will auto-sign-in with the recovery token, we just need to wait
      if (window.location.pathname === '/reset-password') {
        setAuthLoading(false)
        return
      }

      // Normal init — check existing session
      try {
        const session = await getSession()
        if (cancelled) return
        if (session?.user) {
          let prof = null
          try { prof = await loadProfile(session.user.id) } catch (e) { console.error('loadProfile init:', e) }
          if (!prof) { prof = { name: session.user.email?.split('@')[0] || 'User', email: session.user.email || '' }; try { await saveProfile(session.user.id, prof) } catch (e) { console.error('saveProfile init:', e) } }
          if (cancelled) return
          setAuthUser(session.user); setProfile(prof)
          if (prof?.lang) setLang(prof.lang)
          Sentry.setUser({ id: session.user.id, email: session.user.email })
        }
      } catch (e) { console.error('getSession:', e) }
      if (!cancelled) setAuthLoading(false)
    }

    initAuth()

    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      // If user is on /reset-password, don't run normal login flow
      if (window.location.pathname === '/reset-password') {
        if (session?.user) { setAuthUser(session.user); setAuthLoading(false) }
        return
      }

      // Clean up hash tokens from URL
      if (window.location.hash && window.location.hash.includes('access_token')) {
        navigate('/', { replace: true })
      }

      if (session?.user) {
        loadProfile(session.user.id).then(prof => {
          if (!prof) { prof = { name: session.user.email?.split('@')[0] || 'User', email: session.user.email || '' }; saveProfile(session.user.id, prof).catch(e => console.error('saveProfile change:', e)) }
          setAuthUser(session.user); setProfile(prof); Sentry.setUser({ id: session.user.id, email: session.user.email })
          const savedLang = ls.get('q_lang', null); if (savedLang) setLang(savedLang); else if (prof?.lang) setLang(prof.lang)
          setAuthLoading(false)
        }).catch(e => { console.error('loadProfile change:', e); setAuthUser(session.user); setProfile({ name: session.user.email?.split('@')[0] || 'User', email: session.user.email || '' }); setAuthLoading(false) })
      } else { setAuthUser(null); setProfile(null) }
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  const handleAuth = useCallback((user, prof) => { setAuthUser(user); setProfile(prof); if (prof?.lang) setLang(prof.lang); Sentry.setUser({ id: user?.id, email: user?.email }) }, [])
  const handleSignOut = useCallback(async () => { Sentry.setUser(null); try { await authSignOut() } catch (e) { console.error('signOut:', e) }; navigate('/'); window.location.reload() }, [navigate])
  const updateProfile = useCallback(async (updates) => { if (!authUser) return; const updated = { ...profile, ...updates }; setProfile(updated); await saveProfile(authUser.id, updated); if (updates.lang) setLang(updates.lang) }, [authUser, profile])
  const handlePlanClick = useCallback(id => navigate('/plan/' + id), [navigate])
  const handleGoHome = useCallback(() => navigate('/'), [navigate])
  const handleCreateClick = useCallback(() => navigate('/create'), [navigate])

  const Fallback = () => <div style={{ minHeight: '100vh', background: c.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: "'Syne',serif", fontWeight: '800', fontSize: '22px', color: c.T }}>queda<span style={{ color: c.A }}>.</span></div></div>

  const userLocation = profile?.lat && profile?.lng ? { lat: profile.lat, lng: profile.lng } : null
  const showBottomNav = !location.pathname.startsWith('/create')
  const appCtx = useMemo(() => ({ c, lang, authUser, profile }), [c, lang, authUser, profile])

  if (authLoading) return (
    <div role="status" aria-live="assertive" aria-label="Loading" style={{ minHeight: '100vh', background: c.BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontFamily: "'Syne',serif", fontWeight: '800', fontSize: '32px', color: c.T }}>queda<span style={{ color: c.A }}>.</span></div>
      <div style={{ width: '24px', height: '24px', border: `3px solid ${c.BD}`, borderTop: `3px solid ${c.A}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  // Password reset: if on /reset-password and user is authenticated (recovery token), show reset screen
  if (location.pathname === '/reset-password' && authUser) {
    return <React.Suspense fallback={<Fallback />}><ResetPasswordScreen onDone={async () => { try { await authSignOut() } catch (e) { console.error('signOut after reset:', e) }; setAuthUser(null); setProfile(null); navigate('/', { replace: true }) }} c={c} lang={lang} /></React.Suspense>
  }

  if (!authUser) {
    if (showAuth) return <React.Suspense fallback={<Fallback />}><AuthScreen onAuth={handleAuth} c={c} lang={lang} onLangChange={l => { setLang(l); ls.set('q_lang', l) }} /></React.Suspense>
    return <Landing onGetStarted={() => setShowAuth(true)} c={c} lang={lang} onLangChange={l => { setLang(l); ls.set('q_lang', l) }} />
  }

  // Check if profile is incomplete (onboarding)
  const needsOnboard = !profile?.bio && !profile?.birthdate && !profile?.interests?.length

  // Onboarding takes priority
  if (needsOnboard) {
    return (
      <React.Suspense fallback={<Fallback />}>
        <div style={{ minHeight: '100vh', background: c.BG, color: c.T, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
          <div style={{ borderBottom: `1px solid ${c.BD}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, background: c.BG + 'F0', backdropFilter: 'blur(10px)', zIndex: 10 }}>
            <div style={{ fontFamily: "'Syne',serif", fontWeight: '800', fontSize: '22px', color: c.T, letterSpacing: '-.02em' }}>queda<span style={{ color: c.A }}>.</span></div>
          </div>
          <Profile onBack={null} c={c} lang={lang} authUser={authUser} profile={profile} onUpdateProfile={updateProfile} onSignOut={handleSignOut} onLangChange={l => { setLang(l); ls.set('q_lang', l); if (authUser) saveProfile(authUser.id, { ...profile, lang: l }).catch(() => {}) }} onThemeToggle={tgTheme} theme={theme} onboard />
        </div>
      </React.Suspense>
    )
  }

  return (
    <AppProvider value={appCtx}>
    <React.Suspense fallback={<Fallback />}>
      <div style={{ minHeight: '100vh', background: c.BG, color: c.T, fontFamily: "'DM Sans',system-ui,sans-serif" }} onClick={() => { setLangOpen(false) }}>
        <a href="#main-content" className="skip-link">{T[lang]?.skipToContent || 'Skip to content'}</a>
        {toast && <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: showBottomNav ? '72px' : '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? '#22c55e' : toast.type === 'info' ? c.A : '#ef4444', color: toast.type === 'info' ? '#0A0A0A' : '#fff', padding: '12px 20px', borderRadius: '30px', fontWeight: '600', fontSize: '14px', zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,.4)', whiteSpace: 'nowrap', animation: 'slideDown .3s ease' }}>{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'i' : '!'} {toast.msg}</div>}

        {/* Top bar */}
        <header style={{ borderBottom: `1px solid ${c.BD}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: c.BG + 'F0', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <div onClick={() => navigate('/')} style={{ fontFamily: "'Syne',serif", fontWeight: '800', fontSize: '22px', cursor: 'pointer', color: c.T, letterSpacing: '-.02em' }}>queda<span style={{ color: c.A }}>.</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button title={T[lang]?.tipLang} aria-label="Change language" onClick={() => setLangOpen(o => !o)} style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '14px', color: c.T, fontFamily: 'inherit' }}>{({ es: '🇪🇸', en: '🇬🇧', pt: '🇵🇹', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹' })[lang]}</button>
              {langOpen && <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 100, overflow: 'hidden' }}>
                {['es', 'en', 'pt', 'fr', 'de', 'it'].map(l => <button key={l} onClick={() => { setLang(l); ls.set('q_lang', l); if (authUser) saveProfile(authUser.id, { ...profile, lang: l }).catch(() => {}); setLangOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: l === lang ? `${c.A}15` : 'transparent', border: 'none', borderBottom: `1px solid ${c.BD}`, cursor: 'pointer', fontSize: '13px', color: l === lang ? c.A : c.T, fontWeight: l === lang ? '700' : '400', fontFamily: 'inherit' }}>{({ es: '🇪🇸', en: '🇬🇧', pt: '🇵🇹', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹' })[l]}</button>)}
              </div>}
            </div>
            <button title={T[lang]?.tipTheme} aria-label="Toggle theme" onClick={tgTheme} style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '14px', color: c.T, fontFamily: 'inherit' }}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          </div>
        </header>

        <main id="main-content"><Routes>
          <Route path="/" element={<Feed c={c} lang={lang} onPlanClick={handlePlanClick} onCreateClick={handleCreateClick} userLocation={userLocation} />} />
          <Route path="/map" element={<MapFeed c={c} lang={lang} onPlanClick={handlePlanClick} userLocation={userLocation} />} />
          <Route path="/create" element={<Create onBack={handleGoHome} onCreated={p => navigate('/plan/' + p.id)} c={c} lang={lang} authUser={authUser} profile={profile} />} />
          <Route path="/plan/:id" element={<PlanDetail c={c} lang={lang} authUser={authUser} />} />
          <Route path="/profile/:id" element={<PublicProfile c={c} lang={lang} />} />
          <Route path="/profile" element={<Profile onBack={() => navigate('/')} c={c} lang={lang} authUser={authUser} profile={profile} onUpdateProfile={updateProfile} onSignOut={handleSignOut} onLangChange={l => { setLang(l); ls.set('q_lang', l); if (authUser) saveProfile(authUser.id, { ...profile, lang: l }).catch(() => {}) }} onThemeToggle={tgTheme} theme={theme} />} />
          <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center', color: c.M }}>404</div>} />
        </Routes></main>

        {showBottomNav && <BottomNav current={location.pathname} onNavigate={p => navigate(p)} c={c} lang={lang} />}
      </div>
    </React.Suspense>
    </AppProvider>
  )
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>
}
