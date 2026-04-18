/* queda mobile UI kit — shared components */

// ─── Tokens ────────────────────────────────────────────
window.Q = {
  bg: '#060608', bgElev: '#111116', bgCard: '#16161C',
  border: '#222230', borderSoft: 'rgba(255,255,255,0.04)',
  text: '#F0EBE1', textDim: '#7A7A8A', textMid: '#A8A8B5',
  accent: '#CDFF6C', accentInk: '#060608',
  accentSoft: 'rgba(205,255,108,0.12)',
  accentGrad: 'linear-gradient(135deg, #CDFF6C 0%, #7BF5A5 100%)',
  danger: '#FF6068', dangerSoft: 'rgba(255,96,104,0.12)',
  font: "'DM Sans', system-ui, sans-serif",
  fontHead: "'Syne', 'DM Sans', system-ui, sans-serif",
};

const CATEGORIES = [
  { value: 'active',     label: 'Active',     icon: '💪' },
  { value: 'social',     label: 'Social',     icon: '💬' },
  { value: 'experience', label: 'Experience', icon: '✨' },
  { value: 'other',      label: 'Other',      icon: '➕' },
];
const catIcon = v => CATEGORIES.find(c => c.value === v)?.icon ?? '✦';
const catLabel = v => CATEGORIES.find(c => c.value === v)?.label ?? v;

// ─── Wordmark ──────────────────────────────────────────
function Wordmark({ size = 22 }) {
  return (
    <span style={{
      fontFamily: Q.fontHead, fontWeight: 800, fontSize: size,
      letterSpacing: -0.5, lineHeight: 1, color: Q.text,
    }}>
      queda<span style={{ color: Q.accent }}>.</span>
    </span>
  );
}

// ─── Sticky header ─────────────────────────────────────
function Header({ tokens = 14, unread = 2, onBell, onTokens }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px',
      background: 'rgba(6,6,8,0.85)',
      backdropFilter: 'blur(16px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
      borderBottom: `1px solid ${Q.border}`,
    }}>
      <Wordmark size={22} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBell} aria-label="Notifications" style={{
          position: 'relative', background: 'transparent',
          border: `1px solid ${Q.border}`, borderRadius: 999,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: Q.text, cursor: 'pointer', padding: 0,
        }}>
          <BellIcon />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
              background: Q.danger, color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${Q.bg}`,
            }}>{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
        <button onClick={onTokens} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: Q.accentSoft, border: 'none', borderRadius: 999,
          padding: '7px 12px 7px 10px', cursor: 'pointer', fontFamily: Q.font,
          height: 36,
        }}>
          <TokenDot />
          <span style={{ fontSize: 14, fontWeight: 700, color: Q.accent, lineHeight: 1 }}>{tokens}</span>
          <span style={{ fontSize: 11, color: Q.textDim, lineHeight: 1, fontWeight: 600 }}>tkn</span>
        </button>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  );
}
function TokenDot() {
  return (
    <span style={{
      width: 10, height: 10, borderRadius: 999,
      background: Q.accentGrad, boxShadow: '0 0 6px rgba(205,255,108,0.6)',
    }} />
  );
}

// ─── Bottom nav ────────────────────────────────────────
function BottomNav({ active = 'feed', onNav = () => {} }) {
  const items = [
    { id: 'feed',    label: 'Feed',    icon: <IconFeed /> },
    { id: 'create',  label: 'Create',  icon: <IconPlus />, cta: true },
    { id: 'mine',    label: 'Mine',    icon: <IconMine /> },
    { id: 'profile', label: 'Profile', icon: <IconProfile /> },
  ];
  return (
    <nav style={{
      position: 'sticky', bottom: 0, zIndex: 50,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: 'rgba(6,6,8,0.92)',
      backdropFilter: 'blur(16px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
      borderTop: `1px solid ${Q.border}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '12px 0 10px', cursor: 'pointer',
            color: isActive ? Q.accent : Q.textDim,
            fontFamily: Q.font, fontSize: 10, fontWeight: 600, letterSpacing: 0.6,
            transition: 'color 150ms ease',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: it.cta ? 44 : 28, height: it.cta ? 28 : 28,
              borderRadius: it.cta ? 10 : 0,
              background: it.cta ? Q.accentGrad : 'transparent',
              color: it.cta ? Q.accentInk : (isActive ? Q.accent : Q.textDim),
            }}>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function IconFeed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="4" rx="1"/>
      <rect x="3" y="11" width="18" height="4" rx="1"/>
      <rect x="3" y="17" width="18" height="2" rx="1"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}
function IconMine() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M8 4v16M3 10h18"/>
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>
    </svg>
  );
}

// ─── Exports ───────────────────────────────────────────
Object.assign(window, {
  CATEGORIES, catIcon, catLabel,
  Wordmark, Header, BottomNav,
  BellIcon, TokenDot,
  IconFeed, IconPlus, IconMine, IconProfile,
});
