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

// Parse duration text like "25 mins", "1 hour 10 mins", "2 hours" to total minutes
const parseDurationMins = (text) => {
  if (!text) return null
  let mins = 0
  const hMatch = text.match(/(\d+)\s*hour/i)
  const mMatch = text.match(/(\d+)\s*min/i)
  if (hMatch) mins += parseInt(hMatch[1]) * 60
  if (mMatch) mins += parseInt(mMatch[1])
  return mins || null
}

/**
 * @param {object} props
 * @param {{lat,lng,name}} props.origin
 * @param {{lat,lng,name}} props.destination
 * @param {string} props.fromLabel - e.g. "📍 Punto de encuentro" or "1) Bar Cremaet"
 * @param {string} props.toLabel - e.g. "1) Bar Cremaet" or "2) Mya"
 * @param {string} [props.departureTime] - HH:MM to calculate arrival times
 * @param {object} props.c - colors
 * @param {object} props.t - translations
 */
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
          if (!cancelled) res[mode.key] = {
            duration: result.duration.text,
            distance: result.distance.text,
            durationMins: Math.round((result.duration.value || 0) / 60)
          }
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
      <div style={{ fontSize: '10px', color: c.M, fontWeight: '600', marginBottom: '8px', letterSpacing: '.03em' }}>
        {fromLabel} → {toLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {MODES.map(mode => results[mode.key] ? (
          <div key={mode.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {mode.emoji} {results[mode.key].duration}
            </span>
            {departureTime && results[mode.key].durationMins > 0 && (
              <span style={{ fontSize: '11px', color: c.M, fontWeight: '600' }}>
                → {addMinsToTime(departureTime, results[mode.key].durationMins)}
              </span>
            )}
          </div>
        ) : null)}
        {flightInfo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✈️ ~{flightInfo.mins}min ({flightInfo.distKm}km)
            </span>
            {departureTime && flightInfo.mins > 0 && (
              <span style={{ fontSize: '11px', color: c.M, fontWeight: '600' }}>
                → {addMinsToTime(departureTime, flightInfo.mins)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
