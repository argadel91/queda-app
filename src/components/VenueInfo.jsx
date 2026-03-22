import React, { useState } from 'react'
import T from '../constants/translations.js'

const PRICE = { 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' }

export default function VenueInfo({ stop, c, lang }) {
  const t = T[lang];
  const [expanded, setExpanded] = useState(false);
  if (!stop?.lat || !stop?.lng) return null;

  const gmUrl = stop.googleMapsURI || `https://www.google.com/maps/search/${encodeURIComponent(stop.name || '')}/@${stop.lat},${stop.lng},17z`;
  const hasDetails = stop.rating || stop.website || stop.phone || stop.hours || stop.photo;

  // Tags: always visible
  const tags = [];
  if (stop.rating) tags.push(`⭐ ${stop.rating}${stop.ratingCount ? ` (${stop.ratingCount})` : ''}`);
  if (stop.priceLevel) tags.push(PRICE[stop.priceLevel] || '');
  if (stop.isOpen === true) tags.push('🟢 ' + (t.venueOpen || 'Open'));
  if (stop.isOpen === false) tags.push('🔴 ' + (t.venueClosed || 'Closed'));
  if (stop.outdoorSeating) tags.push('🌤️ ' + (t.venueTerrace || 'Terrace'));
  if (stop.wheelchair) tags.push('♿');
  if (stop.goodForChildren) tags.push('👶');
  if (stop.servesBeer) tags.push('🍺');
  if (stop.servesWine) tags.push('🍷');
  if (stop.reservable) tags.push('📞 ' + (t.venueReservable || 'Reservable'));

  // Service tags
  const services = [];
  if (stop.dineIn) services.push(t.venueDineIn || 'Dine in');
  if (stop.takeout) services.push(t.venueTakeout || 'Takeout');
  if (stop.delivery) services.push(t.venueDelivery || 'Delivery');

  return (<div style={{ marginTop: '8px' }}>
    {/* Photo */}
    {stop.photo && <img src={stop.photo} alt={stop.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />}

    {/* Summary */}
    {stop.summary && <div style={{ fontSize: '12px', color: c.M2, fontStyle: 'italic', marginBottom: '6px', lineHeight: 1.5 }}>"{stop.summary}"</div>}

    {/* Tags */}
    {tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
      {tags.map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: `${c.A}15`, color: c.A, border: `1px solid ${c.A}30`, fontWeight: '600' }}>{t}</span>)}
    </div>}

    {/* Services */}
    {services.length > 0 && <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
      {services.map((s, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: c.CARD2, color: c.M2, border: `1px solid ${c.BD}` }}>{s}</span>)}
    </div>}

    {/* Expandable details */}
    {hasDetails && !expanded && <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', color: c.A, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', padding: '4px 0', fontWeight: '600' }}>{t.venueMoreInfo || 'More info'} ▾</button>}

    {expanded && <>
      {/* Hours */}
      {stop.hours && <div style={{ marginBottom: '6px' }}>
        {stop.hours.map((h, i) => <div key={i} style={{ fontSize: '11px', color: c.M2, lineHeight: 1.6 }}>🕐 {h}</div>)}
      </div>}

      {/* Phone */}
      {stop.phone && <div style={{ fontSize: '12px', color: c.M2, marginBottom: '4px' }}>📞 <a href={`tel:${stop.phone}`} style={{ color: c.A, textDecoration: 'none' }}>{stop.phone}</a></div>}

      {/* Website */}
      {stop.website && <a href={stop.website.startsWith('http') ? stop.website : 'https://' + stop.website} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '12px', color: c.A, marginBottom: '4px', textDecoration: 'none' }}>🌐 {stop.website.replace(/^https?:\/\//, '').split('/')[0]}</a>}

      <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: c.M2, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', padding: '4px 0' }}>▴ {t.venueLessInfo || 'Less'}</button>
    </>}

    {/* Google Maps link — always visible */}
    <a href={gmUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#4285F415', border: '1px solid #4285F440', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', color: '#4285F4', fontWeight: '600', marginTop: '4px' }}>🗺️ {t.venueGoogleMaps || 'View on Google Maps'} ↗</a>
  </div>);
}
