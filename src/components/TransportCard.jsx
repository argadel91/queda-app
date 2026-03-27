import React, { useState, useEffect } from 'react'
import { addMinsToTime } from '../lib/utils.js'

const loadGM = () => {
  if (window.__loadGoogleMaps) window.__loadGoogleMaps()
  return new Promise(resolve => {
    if (window.google?.maps) return resolve()
    const check = setInterval(() => {
      if (window.google?.maps) { clearInterval(check); resolve() }
    }, 100)
    setTimeout(() => clearInterval(check), 10000)
  })
}

const MODES = [
  { key: 'DRIVING', emoji: '🚗' },
  { key: 'TRANSIT', emoji: '🚌' },
  { key: 'WALKING', emoji: '🚶' },
  { key: 'BICYCLING', emoji: '🚲' },
]

export default function TransportCard({ origin, destination, fromLabel, toLabel, departureTime, c, t }) {
  const [results, setResults] = useState({})
  const [flightInfo, setFlightInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!origin?.lat || !destination?.lat) return
    let cancelled = false
    setLoading(true)

    loadGM().then(async () => {
      if (cancelled) return
      if (google.maps.importLibrary) await google.maps.importLibrary('geometry')

      const svc = new google.maps.DirectionsService()
      const o = new google.maps.LatLng(origin.lat, origin.lng)
      const d = new google.maps.LatLng(destination.lat, destination.lng)

      try {
        const distM = google.maps.geometry.spherical.computeDistanceBetween(o, d)
        const distKm = Math.round(distM / 1000)
        const flightMins = Math.round(distKm / 800 * 60)
        if (!cancelled) setFlightInfo(distKm > 100 ? { distKm, mins: flightMins } : null)
      } catch { /* geometry not available */ }

      const res = {}
      for (const mode of MODES) {
        try {
          const result = await new Promise((resolve, reject) => {
            svc.route({
              origin: o, destination: d,
              travelMode: google.maps.TravelMode[mode.key]
            }, (r, status) => {
              if (status === 'OK' && r.routes?.[0]?.legs?.[0]) resolve(r.routes[0].legs[0])
              else reject(status)
            })
          })
          if (!cancelled) res[mode.key] = {
            duration: result.duration.text,
            distance: result.distance.text,
            durationMins: Math.round((result.duration.value || 0) / 60)
          }
        } catch { /* mode unavailable */ }
      }
      if (!cancelled) { setResults(res); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  if (!origin?.lat || !destination?.lat) return null
  if (loading) return <div style={{ textAlign: 'center', padding: '6px', color: c.M2, fontSize: '11px' }}>...</div>

  const hasAny = Object.keys(results).length > 0 || flightInfo
  if (!hasAny) return null

  const items = [
    ...MODES.filter(m => results[m.key]).map(m => ({
      emoji: m.emoji,
      dur: results[m.key].duration,
      arrival: departureTime && results[m.key].durationMins > 0 ? addMinsToTime(departureTime, results[m.key].durationMins) : null
    })),
    ...(flightInfo ? [{
      emoji: '✈️',
      dur: `~${flightInfo.mins}min`,
      arrival: departureTime && flightInfo.mins > 0 ? addMinsToTime(departureTime, flightInfo.mins) : null
    }] : [])
  ]

  return (
    <div style={{
      background: c.CARD2, border: `1px dashed ${c.BD}`, borderRadius: '10px',
      padding: '10px 12px', marginBottom: '10px'
    }}>
      <div style={{ fontSize: '10px', color: c.M, fontWeight: '600', marginBottom: '4px', letterSpacing: '.03em' }}>
        {t.tHowToGet || 'Cómo llegar'}
      </div>
      <div style={{ fontSize: '10px', color: c.M2, marginBottom: '8px' }}>
        {fromLabel} → {toLabel}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '4px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '48px' }}>
            <div style={{ fontSize: '18px' }}>{it.emoji}</div>
            <div style={{ fontSize: '10px', color: c.M2, whiteSpace: 'nowrap' }}>{it.dur}</div>
            {it.arrival && <div style={{ fontSize: '10px', color: c.M, fontWeight: '600', whiteSpace: 'nowrap' }}>→ {it.arrival}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
