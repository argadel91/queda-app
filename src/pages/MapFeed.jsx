import React, { useState, useEffect, useRef, useCallback } from 'react'
import T from '../constants/translations.js'
import { fetchPlans } from '../lib/supabase.js'
import { getCategoryEmoji, getCategoryLabel } from '../constants/categories.js'
import { fmtShort } from '../lib/utils.js'
import FilterBar from '../components/FilterBar.jsx'
import useGeolocation from '../hooks/useGeolocation.js'

import { loadMapsLib } from '../lib/googleMaps.js'

const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default function MapFeed({ c, lang, onPlanClick, userLocation }) {
  const t = T[lang]
  const [plans, setPlans] = useState([])
  const [filters, setFilters] = useState({ category: '', dateRange: '', radiusKm: '' })
  const [selected, setSelected] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const geo = useGeolocation()

  const myLat = userLocation?.lat || geo.location?.lat
  const myLng = userLocation?.lng || geo.location?.lng

  const load = useCallback(async () => {
    const params = {}
    if (filters.category) params.category = filters.category
    const today = new Date().toISOString().slice(0, 10)
    if (filters.dateRange === 'today') { params.dateFrom = today; params.dateTo = today }
    else if (filters.dateRange === 'week') { const d = new Date(); d.setDate(d.getDate() + 7); params.dateFrom = today; params.dateTo = d.toISOString().slice(0, 10) }
    else if (filters.dateRange === 'month') { const d = new Date(); d.setMonth(d.getMonth() + 1); params.dateFrom = today; params.dateTo = d.toISOString().slice(0, 10) }
    if (filters.radiusKm && myLat && myLng) { params.lat = myLat; params.lng = myLng; params.radiusKm = Number(filters.radiusKm) }
    params.limit = 50
    const result = await fetchPlans(params)
    setPlans(result.plans)
  }, [filters, myLat, myLng])

  useEffect(() => { load() }, [load])

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const timer = setTimeout(() => {
      loadMapsLib().then(() => {
        if (!window.google?.maps || !mapRef.current) return
        const center = myLat && myLng ? { lat: myLat, lng: myLng } : { lat: 40.4168, lng: -3.7038 }
        mapObj.current = new google.maps.Map(mapRef.current, {
          center, zoom: myLat ? 12 : 6,
          disableDefaultUI: true, zoomControl: true,
          gestureHandling: 'greedy',
          styles: c.BG === '#0A0A0A' ? [
            { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
          ] : []
        })
        setMapReady(true)
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Update markers when plans change
  useEffect(() => {
    if (!mapObj.current || !mapReady) return
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (infoRef.current) infoRef.current.close()

    plans.forEach(plan => {
      if (!plan.lat || !plan.lng) return
      const emoji = getCategoryEmoji(plan.category)
      const marker = new google.maps.Marker({
        position: { lat: plan.lat, lng: plan.lng },
        map: mapObj.current,
        label: { text: emoji, fontSize: '18px' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: c.CARD,
          fillOpacity: 0.9,
          strokeColor: c.A,
          strokeWeight: 2
        },
        title: plan.title
      })

      marker.addListener('click', () => {
        setSelected(plan)
        if (infoRef.current) infoRef.current.close()
        const spotsLeft = plan.capacity - (plan.participant_count || 0)
        const orgName = plan.profiles?.name || '?'
        const content = `
          <div style="font-family:'DM Sans',system-ui,sans-serif;padding:4px;min-width:200px;max-width:260px">
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(emoji)} ${esc(plan.title)}</div>
            <div style="font-size:12px;color:#666;margin-bottom:2px">📅 ${esc(fmtShort(plan.date, lang))} · 🕐 ${esc(plan.time?.slice(0, 5))}</div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">📍 ${esc(plan.place_name)}</div>
            <div style="font-size:12px;color:#666">👤 ${esc(orgName)} · 👥 ${spotsLeft > 0 ? spotsLeft + ' spots' : 'Full'}</div>
            <div style="margin-top:8px;text-align:center">
              <span style="font-size:11px;color:#4A8800;font-weight:600;cursor:pointer">View plan →</span>
            </div>
          </div>
        `
        const infoWindow = new google.maps.InfoWindow({ content })
        infoWindow.open(mapObj.current, marker)
        infoRef.current = infoWindow

        google.maps.event.addListener(infoWindow, 'domready', () => {
          const el = infoWindow.getContent()
          if (typeof el === 'string') {
            // Add click listener to the info window
            const container = document.querySelector('.gm-style-iw')
            if (container) container.style.cursor = 'pointer'
            if (container) container.addEventListener('click', () => onPlanClick(plan.id))
          }
        })
      })

      markersRef.current.push(marker)
    })

    // Fit bounds if plans exist
    if (plans.length > 0 && !myLat) {
      const bounds = new google.maps.LatLngBounds()
      plans.forEach(p => { if (p.lat && p.lng) bounds.extend({ lat: p.lat, lng: p.lng }) })
      mapObj.current.fitBounds(bounds, 50)
    }
  }, [plans, mapReady])

  const handleFilterChange = newFilters => {
    if (newFilters.radiusKm && !myLat && !geo.loading) geo.request()
    setFilters(newFilters)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <FilterBar filters={filters} onChange={handleFilterChange} lang={lang} c={c} />
      </div>
      <div ref={mapRef} style={{ flex: 1, minHeight: '300px' }} />

      {/* Selected plan card at bottom */}
      {selected && (
        <div onClick={() => onPlanClick(selected.id)} style={{
          position: 'absolute', bottom: '70px', left: '12px', right: '12px',
          background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '16px',
          padding: '14px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', gap: '12px', zIndex: 5
        }}>
          <div style={{ fontSize: '28px' }}>{getCategoryEmoji(selected.category)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: c.T, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
            <div style={{ fontSize: '12px', color: c.M }}>
              {fmtShort(selected.date, lang)} · {selected.time?.slice(0, 5)} · {selected.place_name}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); setSelected(null) }} style={{ background: 'none', border: 'none', color: c.M, fontSize: '18px', cursor: 'pointer', padding: '4px' }}>×</button>
        </div>
      )}
    </div>
  )
}
