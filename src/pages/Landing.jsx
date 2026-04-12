import React, { useState } from 'react'
import T from '../constants/translations.js'
import CATEGORIES from '../constants/categories.js'

export default function Landing({ onGetStarted, c, lang, onLangChange }) {
  const t = T[lang] || T.en
  const FLAGS = { es: '🇪🇸', en: '🇬🇧', pt: '🇵🇹', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹' }
  const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it']
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: c.BG, color: c.T, fontFamily: "'DM Sans',system-ui,sans-serif" }} onClick={() => setLangOpen(false)}>

      {/* Nav */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '500px', width: '100%', margin: '0 auto' }}>
        <div style={{ fontFamily: "'Syne',serif", fontWeight: '800', fontSize: '22px', letterSpacing: '-.02em' }}>queda<span style={{ color: c.A }}>.</span></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLangOpen(o => !o)} style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', color: c.T, fontFamily: 'inherit' }}>{FLAGS[lang]} <span style={{ fontSize: '10px', color: c.M }}>▾</span></button>
            {langOpen && <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 100, overflow: 'hidden', minWidth: '120px' }}>
              {LANGS.map(l => <button key={l} onClick={() => { onLangChange(l); setLangOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: l === lang ? `${c.A}15` : 'transparent', border: 'none', borderBottom: `1px solid ${c.BD}`, cursor: 'pointer', fontSize: '13px', color: l === lang ? c.A : c.T, fontWeight: l === lang ? '700' : '400', textAlign: 'left', fontFamily: 'inherit' }}>{FLAGS[l]}</button>)}
            </div>}
          </div>
          <button onClick={onGetStarted} style={{ background: 'transparent', border: `1px solid ${c.A}`, borderRadius: '8px', padding: '6px 16px', color: c.A, cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>{t.landingSignIn}</button>
        </div>
      </div>

      <div style={{ maxWidth: '500px', width: '100%', margin: '0 auto', padding: '0 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
          <h1 style={{ fontFamily: "'Syne',serif", fontSize: '44px', fontWeight: '800', lineHeight: 1.05, marginBottom: '16px', letterSpacing: '-.03em' }}>
            {t.landingHero1}<br /><span style={{ color: c.A }}>{t.landingHero2}</span>
          </h1>
          <p style={{ fontSize: '16px', color: c.M2, lineHeight: 1.7, marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px' }}>{t.landingSub}</p>
          <button onClick={onGetStarted} style={{ padding: '16px 44px', background: c.A, color: '#0A0A0A', border: 'none', borderRadius: '14px', fontSize: '17px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>{t.landingCta}</button>
          <div style={{ fontSize: '12px', color: c.M, marginTop: '10px' }}>{t.landingFree}</div>
        </div>

        {/* 3 steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
          {[
            { emoji: '✨', title: t.landingStep1, desc: t.landingStep1d },
            { emoji: '🔍', title: t.landingStep2, desc: t.landingStep2d },
            { emoji: '🤝', title: t.landingStep3, desc: t.landingStep3d },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '18px', background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px' }}>
              <div style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}>{s.emoji}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: c.T, marginBottom: '4px' }}>{s.title}</div>
                <div style={{ fontSize: '13px', color: c.M2, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Syne',serif", fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '20px' }}>{t.landingCatTitle}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {CATEGORIES.filter(cat => cat.slug !== 'other').map(cat => (
              <div key={cat.slug} style={{ padding: '8px 14px', background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '20px', fontSize: '13px', color: c.T }}>
                {cat.emoji} {cat.labels[lang] || cat.labels.en}
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', paddingBottom: '48px' }}>
          <p style={{ fontSize: '18px', fontWeight: '600', color: c.T, marginBottom: '20px' }}>{t.landingTagline}</p>
          <button onClick={onGetStarted} style={{ padding: '16px 44px', background: c.A, color: '#0A0A0A', border: 'none', borderRadius: '14px', fontSize: '17px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>{t.landingCta}</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', color: c.M }}>
        queda.
      </div>
    </div>
  )
}
