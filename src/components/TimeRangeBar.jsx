import React, { useRef, useCallback } from 'react'

const HOURS = [0,2,4,6,8,10,12,14,16,18,20,22,24];
const pad = n => String(n).padStart(2,'0');
const toMins = (h,m) => h*60+m;
const fromMins = m => ({ h: Math.floor(m/60)%24, m: m%60 });
const fmtM = m => { const {h,m:mm} = fromMins(m); return `${pad(h)}:${pad(mm)}`; };

export default function TimeRangeBar({ from, to, onChange, c }) {
  const barRef = useRef(null);
  const dragging = useRef(null);

  const fromMinsVal = from ? toMins(...from.split(':').map(Number)) : 480;
  const toMinsVal = to ? toMins(...to.split(':').map(Number)) : 1320;

  const getMinFromX = useCallback((clientX) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = Math.round(pct * 1440 / 15) * 15; // snap to 15min
    return Math.max(0, Math.min(1425, raw));
  }, []);

  const handleStart = useCallback((handle, e) => {
    e.preventDefault();
    dragging.current = handle;
    const move = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const mins = getMinFromX(clientX);
      if (dragging.current === 'from') {
        if (mins < toMinsVal) onChange(fmtM(mins), fmtM(toMinsVal));
      } else {
        if (mins > fromMinsVal) onChange(fmtM(fromMinsVal), fmtM(mins));
      }
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }, [fromMinsVal, toMinsVal, getMinFromX, onChange]);

  const leftPct = (fromMinsVal / 1440) * 100;
  const rightPct = (toMinsVal / 1440) * 100;
  const accent = c?.A || '#CDFF6C';

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: c?.T, marginBottom: '8px' }}>
        <span>{fmtM(fromMinsVal)}</span>
        <span style={{ color: c?.M2, fontSize: '11px', fontWeight: '400' }}>→</span>
        <span>{fmtM(toMinsVal)}</span>
      </div>

      {/* Bar */}
      <div ref={barRef} style={{
        position: 'relative', height: '32px', background: c?.CARD2 || '#1a1a1a',
        borderRadius: '8px', border: `1px solid ${c?.BD || '#333'}`, cursor: 'pointer',
        touchAction: 'none'
      }}
        onClick={(e) => {
          const mins = getMinFromX(e.clientX);
          const distFrom = Math.abs(mins - fromMinsVal);
          const distTo = Math.abs(mins - toMinsVal);
          if (distFrom < distTo) {
            if (mins < toMinsVal) onChange(fmtM(mins), fmtM(toMinsVal));
          } else {
            if (mins > fromMinsVal) onChange(fmtM(fromMinsVal), fmtM(mins));
          }
        }}
      >
        {/* Selected range */}
        <div style={{
          position: 'absolute', top: '2px', bottom: '2px',
          left: `${leftPct}%`, width: `${rightPct - leftPct}%`,
          background: `${accent}30`, borderRadius: '6px', border: `1px solid ${accent}50`
        }} />

        {/* Hour markers */}
        {HOURS.map(h => (
          <div key={h} style={{
            position: 'absolute', left: `${(h / 24) * 100}%`, top: 0, bottom: 0,
            width: '1px', background: c?.BD || '#333', opacity: 0.5
          }}>
            <span style={{
              position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '9px', color: c?.M2 || '#888', whiteSpace: 'nowrap'
            }}>{h < 24 ? pad(h) : ''}</span>
          </div>
        ))}

        {/* From handle */}
        <div
          onMouseDown={e => handleStart('from', e)}
          onTouchStart={e => handleStart('from', e)}
          style={{
            position: 'absolute', left: `${leftPct}%`, top: '50%',
            transform: 'translate(-50%, -50%)', width: '22px', height: '22px',
            borderRadius: '50%', background: accent, border: '2px solid #0A0A0A',
            cursor: 'grab', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,.3)'
          }}
        />

        {/* To handle */}
        <div
          onMouseDown={e => handleStart('to', e)}
          onTouchStart={e => handleStart('to', e)}
          style={{
            position: 'absolute', left: `${rightPct}%`, top: '50%',
            transform: 'translate(-50%, -50%)', width: '22px', height: '22px',
            borderRadius: '50%', background: accent, border: '2px solid #0A0A0A',
            cursor: 'grab', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,.3)'
          }}
        />
      </div>

      {/* Bottom hour labels spacing */}
      <div style={{ height: '18px' }} />
    </div>
  );
}
