import React, { useState, useEffect } from 'react'

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
  { key: 'DRIVING', emoji: '\u{1F697}' },
  { key: 'TRANSIT', emoji: '\u{1F68C}' },
  { key: 'WALKING', emoji: '\u{1F6B6}' },
  { key: 'BICYCLING', emoji: '\u{1F6B2}' },
]

export default function TransportCard({ origin, destination, c, t }) {
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

      // Flight estimate via straight-line distance
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
          if (!cancelled) res[mode.key] = { duration: result.duration.text, distance: result.distance.text }
        } catch { /* mode unavailable in this region */ }
      }
      if (!cancelled) { setResults(res); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  if (!origin?.lat || !destination?.lat) return null
  if (loading) return <div style={{ textAlign: 'center', padding: '6px', color: c.M2, fontSize: '11px' }}>...</div>

  const hasAny = Object.keys(results).length > 0 || flightInfo
  if (!hasAny) return null

  return (
    <div style={{
      background: c.CARD2, border: `1px dashed ${c.BD}`, borderRadius: '10px',
      padding: '10px 12px', marginBottom: '10px', fontSize: '11px', color: c.M2
    }}>
      <div style={{ fontSize: '10px', color: c.M, fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {t.tBetweenStops || 'Travel between stops'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {MODES.map(mode => results[mode.key] ? (
          <span key={mode.key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px' }}>
            {mode.emoji} {results[mode.key].duration}
          </span>
        ) : null)}
        {flightInfo && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px' }}>
            {'\u2708\uFE0F'} ~{flightInfo.mins}min ({flightInfo.distKm}km)
          </span>
        )}
      </div>
    </div>
  )
}
