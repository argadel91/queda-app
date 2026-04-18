/* queda mobile UI kit — Feed screen (bold minimalism v2) */

const HERO = {
  title: 'Pickup football',
  time: '18:30',
  place: 'Platt Fields',
  going: 6, capacity: 10,
  attendees: [
    { initial: 'M', color: '#CDFF6C', ink: '#060608' },
    { initial: 'J', color: '#FFB36B', ink: '#060608' },
    { initial: 'A', color: '#6BC5FF', ink: '#060608' },
  ],
};

const PLANS = [
  { id: '1', title: 'Sunrise run', day: 'Sat', time: '07:30', place: 'Fallowfield', going: 3, cap: 8 },
  { id: '2', title: 'Boardgames', day: 'Sat', time: '19:00', place: 'Kampus', going: 4, cap: 6 },
  { id: '5', title: 'Peak District hike', day: 'Sun', time: '09:00', place: 'Edale', going: 5, cap: 6 },
];

function FeedScreen({ onOpen = () => {} }) {
  return (
    <div style={{ padding: '12px 32px 40px' }}>

      {/* Meta line */}
      <div style={{
        fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
        color: Q.textDim, fontWeight: 700, padding: '32px 0 22px',
      }}>
        Manchester · Fri 18 Apr
      </div>

      {/* Giant heading */}
      <h1 style={{
        fontFamily: Q.fontHead, fontSize: 72, fontWeight: 800,
        letterSpacing: -3.4, lineHeight: 0.88, margin: '0 0 60px', color: Q.text,
      }}>
        Tonight<span style={{ color: Q.accent }}>.</span>
      </h1>

      {/* HERO */}
      <button onClick={() => onOpen(HERO)} style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer', fontFamily: Q.font, marginBottom: 72,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          fontWeight: 700, color: Q.accent, marginBottom: 24,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 999, background: Q.accent,
            boxShadow: '0 0 12px rgba(205,255,108,1)',
          }}/>
          In 3 hours
        </div>

        <div style={{
          fontFamily: Q.fontHead, fontSize: 52, fontWeight: 800,
          letterSpacing: -2.2, lineHeight: 0.92, color: Q.text,
          marginBottom: 36,
        }}>{HERO.title}</div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
          marginBottom: 32,
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: Q.textDim, fontWeight: 700, marginBottom: 8 }}>When</div>
            <div style={{ fontFamily: Q.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.8, color: Q.text }}>
              {HERO.time}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: Q.textDim, fontWeight: 700, marginBottom: 8 }}>Where</div>
            <div style={{ fontFamily: Q.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.8, color: Q.text }}>
              {HERO.place}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex' }}>
              {HERO.attendees.map((p, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 999,
                  background: p.color, border: `2px solid ${Q.bg}`,
                  marginLeft: i === 0 ? 0 : -12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: p.ink,
                }}>{p.initial}</div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: Q.textDim, fontWeight: 600 }}>
              {HERO.going}/{HERO.capacity}
            </span>
          </div>
          <span style={{
            padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 800,
            background: Q.accent, color: Q.accentInk,
            fontFamily: Q.fontHead, letterSpacing: -0.3,
          }}>Join →</span>
        </div>
      </button>

      {/* Section label */}
      <div style={{
        fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
        color: Q.textDim, fontWeight: 700, marginBottom: 30,
      }}>
        Later — {PLANS.length}
      </div>

      {/* Minimal rows */}
      {PLANS.map((p, i) => (
        <button key={p.id} onClick={() => onOpen(p)} style={{
          display: 'flex', width: '100%', textAlign: 'left',
          background: 'transparent', border: 'none',
          borderTop: i === 0 ? `1px solid ${Q.border}` : 'none',
          borderBottom: `1px solid ${Q.border}`,
          padding: '28px 0', gap: 24, cursor: 'pointer', fontFamily: Q.font,
          alignItems: 'center',
        }}>
          <div style={{
            flexShrink: 0, width: 56,
            fontFamily: Q.fontHead, fontSize: 11, fontWeight: 800,
            letterSpacing: 1.8, textTransform: 'uppercase', color: Q.accent,
          }}>
            {p.day}
            <div style={{ color: Q.text, letterSpacing: -0.5, fontSize: 18, marginTop: 4 }}>
              {p.time}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: Q.fontHead, fontSize: 26, fontWeight: 800,
              letterSpacing: -1, color: Q.text, lineHeight: 1,
              marginBottom: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.title}</div>
            <div style={{ fontSize: 12, color: Q.textDim, fontWeight: 600, letterSpacing: 0.3 }}>
              {p.place} · {p.going}/{p.cap}
            </div>
          </div>
        </button>
      ))}

      {/* Create — single line, no chrome */}
      <button onClick={() => onOpen({ id: 'create' })} style={{
        width: '100%', marginTop: 56,
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: Q.fontHead, fontSize: 20, fontWeight: 800,
        letterSpacing: -0.6, color: Q.text, textAlign: 'left', padding: 0,
      }}>
        Create a plan <span style={{ color: Q.accent }}>→</span>
      </button>
    </div>
  );
}

Object.assign(window, { FeedScreen, HERO, PLANS });
