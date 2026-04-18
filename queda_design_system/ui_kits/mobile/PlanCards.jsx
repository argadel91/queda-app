/* queda mobile UI kit — plan card variants */

function FilterPills({ active, onChange, counts = {} }) {
  const options = [
    { v: '', l: 'All', n: counts.all },
    { v: 'active', l: 'Active', icon: '💪', n: counts.active },
    { v: 'social', l: 'Social', icon: '💬', n: counts.social },
    { v: 'experience', l: 'Experience', icon: '✨', n: counts.experience },
    { v: 'other', l: 'Other', icon: '➕', n: counts.other },
  ];
  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
      marginBottom: 4, WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    }}>
      {options.map(o => {
        const isActive = (active || '') === o.v;
        return (
          <button key={o.v || 'all'} onClick={() => onChange(o.v === active ? '' : o.v)} style={{
            padding: '8px 14px', borderRadius: 999,
            border: isActive ? 'none' : `1px solid ${Q.border}`,
            background: isActive ? Q.accentGrad : 'transparent',
            color: isActive ? Q.accentInk : Q.text,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: Q.font, transition: 'all 150ms ease',
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            {o.icon && <span style={{ fontSize: 13 }}>{o.icon}</span>}
            <span>{o.l}</span>
            {typeof o.n === 'number' && (
              <span style={{
                fontSize: 11, fontWeight: 700, opacity: isActive ? 0.6 : 0.5,
                marginLeft: 2,
              }}>{o.n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Day header — groups the feed by date (Today / Tomorrow / dated). */
function DayHeader({ label, sublabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '22px 2px 10px', gap: 12,
    }}>
      <span style={{
        fontFamily: Q.fontHead, fontSize: 14, fontWeight: 800,
        letterSpacing: 1.5, textTransform: 'uppercase', color: Q.text,
      }}>{label}</span>
      {sublabel && (
        <span style={{ fontSize: 11, color: Q.textDim, fontWeight: 600, letterSpacing: 1 }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* The hero card — featured, visual, larger type. */
function HeroPlanCard({ plan, count, onClick }) {
  const dateStr = formatDate(plan.date, plan.time);
  const timeStr = plan.time.slice(0, 5);
  const spots = plan.capacity - (count || 0);
  const almostFull = spots <= 2 && spots > 0;

  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      background: Q.bgCard, border: `1px solid ${Q.border}`,
      borderRadius: 18, padding: 0, overflow: 'hidden',
      cursor: 'pointer', fontFamily: Q.font, marginBottom: 12,
      position: 'relative',
    }}>
      {/* Top accent ribbon */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'linear-gradient(90deg, rgba(205,255,108,0.10) 0%, rgba(205,255,108,0) 60%)',
        borderBottom: `1px solid ${Q.border}`,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', color: Q.accent,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: Q.accent,
            boxShadow: '0 0 6px rgba(205,255,108,0.8)',
          }}/>
          Happening today
        </span>
        <span style={{ fontSize: 11, color: Q.textDim, fontWeight: 600, letterSpacing: 0.5 }}>
          in 3h · {timeStr}
        </span>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        }}>
          <CategoryBadge category={plan.category} />
          {plan.gender_filter !== 'mixed' && <MetaChip>{plan.gender_filter === 'male' ? '♂ Men' : '♀ Women'}</MetaChip>}
          {plan.join_mode === 'approval' && <MetaChip>Approval</MetaChip>}
        </div>

        <div style={{
          fontFamily: Q.fontHead, fontSize: 22, fontWeight: 800,
          letterSpacing: -0.6, lineHeight: 1.15, color: Q.text,
          marginBottom: 8,
        }}>{plan.title}</div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: Q.textMid, marginBottom: 14,
        }}>
          <PinIcon />
          <span>{plan.place_name}</span>
          {plan.distance && <span style={{ color: Q.textDim }}>· {plan.distance}</span>}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}>
          <AvatarStack people={plan.attendees || []} total={count} capacity={plan.capacity} almostFull={almostFull} />
          <span style={{
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: Q.accentGrad, color: Q.accentInk,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>Join · 1 tkn <ArrowRight /></span>
        </div>
      </div>
    </button>
  );
}

/* Standard card — the default row in the feed. */
function PlanCard({ plan, count, onClick }) {
  const d = new Date(plan.date + 'T' + plan.time);
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const spots = plan.capacity - (count || 0);
  const almostFull = spots <= 2 && spots > 0;
  const priv = plan.join_mode === 'private';

  return (
    <button onClick={onClick} style={{
      display: 'flex', width: '100%', textAlign: 'left',
      background: Q.bgCard, border: `1px solid ${Q.border}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      cursor: 'pointer', fontFamily: Q.font,
      gap: 14, alignItems: 'stretch',
    }}>
      {/* Time block */}
      <div style={{
        flexShrink: 0, width: 56, padding: '2px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRight: `1px solid ${Q.border}`, paddingRight: 10,
      }}>
        <span style={{
          fontFamily: Q.fontHead, fontSize: 20, fontWeight: 800,
          letterSpacing: -0.5, lineHeight: 1, color: Q.text,
        }}>{timeStr}</span>
        <span style={{
          fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
          color: Q.textDim, fontWeight: 600, marginTop: 4,
        }}>{plan.dayShort || relativeDay(plan.date)}</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 12 }}>{catIcon(plan.category)}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: Q.textDim,
          }}>{catLabel(plan.category)}</span>
          {priv && <span style={{ fontSize: 11, color: Q.textDim }}>· 🔒</span>}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
          color: Q.text, lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{plan.title}</div>
        <div style={{
          fontSize: 12.5, color: Q.textDim, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <PinIcon size={11} />
          <span>{priv ? 'Location hidden' : plan.place_name}</span>
        </div>
      </div>

      {/* Right cap */}
      <div style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', justifyContent: 'space-between',
        paddingLeft: 4,
      }}>
        <span style={{
          padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: almostFull ? Q.dangerSoft : Q.accentSoft,
          color: almostFull ? Q.danger : Q.accent,
          whiteSpace: 'nowrap',
        }}>{count || 0}/{plan.capacity}</span>
        <ArrowRight color={Q.textDim} />
      </div>
    </button>
  );
}

/* Helpers */
function CategoryBadge({ category }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px 4px 8px', borderRadius: 999,
      background: Q.bgElev, border: `1px solid ${Q.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      color: Q.text,
    }}>
      <span style={{ fontSize: 12 }}>{catIcon(category)}</span>
      {catLabel(category)}
    </span>
  );
}

function MetaChip({ children }) {
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999,
      background: Q.bgElev, border: `1px solid ${Q.border}`,
      fontSize: 11, fontWeight: 600, color: Q.textMid,
    }}>{children}</span>
  );
}

function AvatarStack({ people = [], total, capacity, almostFull }) {
  const visible = people.slice(0, 4);
  const spotsLeft = capacity - total;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex' }}>
        {visible.map((p, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 999,
            background: p.color || Q.bgElev,
            border: `2px solid ${Q.bgCard}`,
            marginLeft: i === 0 ? 0 : -8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: p.ink || Q.text,
            fontFamily: Q.font,
          }}>{p.initial}</div>
        ))}
        {total > visible.length && (
          <div style={{
            width: 28, height: 28, borderRadius: 999,
            background: Q.bgElev, border: `2px solid ${Q.bgCard}`,
            marginLeft: -8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: Q.textDim,
          }}>+{total - visible.length}</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: almostFull ? Q.danger : Q.text }}>
          {total}/{capacity}
        </span>
        <span style={{ fontSize: 11, color: almostFull ? Q.danger : Q.textDim, fontWeight: 600 }}>
          {almostFull ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : 'going'}
        </span>
      </div>
    </div>
  );
}

function PinIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function ArrowRight({ color = 'currentColor' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  );
}

function formatDate(date, time) {
  const d = new Date(date + 'T' + time);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function relativeDay(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tmrw';
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

Object.assign(window, {
  FilterPills, DayHeader, HeroPlanCard, PlanCard,
  CategoryBadge, MetaChip, AvatarStack,
  PinIcon, ArrowRight,
  formatDate, relativeDay,
});
