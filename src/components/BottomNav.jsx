import React from 'react'

const TABS = [
  { path: '/', icon: '🔍', labelKey: 'discover' },
  { path: '/map', icon: '🗺️', labelKey: 'map' },
  { path: '/create', icon: '➕', labelKey: 'create' },
  { path: '/profile', icon: '👤', labelKey: 'profile' },
]

const LABELS = {
  discover: { es: 'Descubrir', en: 'Discover', pt: 'Descobrir', fr: 'Découvrir', de: 'Entdecken', it: 'Scopri' },
  map: { es: 'Mapa', en: 'Map', pt: 'Mapa', fr: 'Carte', de: 'Karte', it: 'Mappa' },
  create: { es: 'Crear', en: 'Create', pt: 'Criar', fr: 'Créer', de: 'Erstellen', it: 'Crea' },
  profile: { es: 'Perfil', en: 'Profile', pt: 'Perfil', fr: 'Profil', de: 'Profil', it: 'Profilo' },
}

export default function BottomNav({ current, onNavigate, c, lang }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: c.BG + 'F0', backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${c.BD}`,
      display: 'flex', justifyContent: 'space-around',
      padding: '6px env(safe-area-inset-right, 0px) calc(6px + env(safe-area-inset-bottom, 8px)) env(safe-area-inset-left, 0px)',
      zIndex: 20
    }}>
      {TABS.map(tab => {
        const active = current === tab.path || (tab.path === '/' && current === '/')
        return (
          <button key={tab.path} onClick={() => onNavigate(tab.path)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            padding: '6px 12px', minHeight: '44px', minWidth: '44px', fontFamily: 'inherit',
            color: active ? c.A : c.M,
            transition: 'color .15s'
          }}>
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: active ? '700' : '400' }}>
              {LABELS[tab.labelKey]?.[lang] || LABELS[tab.labelKey]?.en}
            </span>
          </button>
        )
      })}
    </div>
  )
}
