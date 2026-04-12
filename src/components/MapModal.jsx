import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { loadGoogleMaps, loadPlacesLib, loadMapsLib } from '../lib/googleMaps.js'
import { useApp } from '../context/AppContext.jsx'

const extractPlace = (p) => {
  const photoUrl = p.photos?.[0] ? p.photos[0].getURI?.({ maxWidth: 400 }) || null : null
  const hours = p.regularOpeningHours?.weekdayDescriptions || null
  const isOpen = p.regularOpeningHours?.isOpen?.() ?? null
  return {
    name: p.displayName || '', address: p.formattedAddress || '',
    lat: p.location?.lat(), lng: p.location?.lng(),
    rating: p.rating || null, ratingCount: p.userRatingCount || null,
    priceLevel: p.priceLevel ?? null,
    website: p.websiteURI || null, phone: p.nationalPhoneNumber || null,
    hours, isOpen, googleMapsURI: p.googleMapsURI || null,
    types: p.types || [], businessStatus: p.businessStatus || null,
    photo: photoUrl, summary: p.editorialSummary || null,
    dineIn: p.dineIn ?? null, takeout: p.takeout ?? null, delivery: p.delivery ?? null,
    reservable: p.reservable ?? null,
    servesBreakfast: p.servesBreakfast ?? null, servesLunch: p.servesLunch ?? null, servesDinner: p.servesDinner ?? null,
    servesBeer: p.servesBeer ?? null, servesWine: p.servesWine ?? null,
    outdoorSeating: p.outdoorSeating ?? null, goodForChildren: p.goodForChildren ?? null,
    wheelchair: p.accessibilityOptions?.wheelchairAccessibleEntrance ?? null,
  }
}

const enrichPlace = async (sel) => {
  if (!sel.placeId) return sel
  try {
    await loadPlacesLib()
    const { Place } = google.maps.places
    const place = new Place({ id: sel.placeId })
    await place.fetchFields({ fields: ['displayName', 'websiteURI', 'nationalPhoneNumber', 'regularOpeningHours', 'priceLevel', 'rating', 'userRatingCount', 'photos', 'editorialSummary', 'googleMapsURI', 'dineIn', 'takeout', 'delivery', 'reservable', 'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBeer', 'servesWine', 'outdoorSeating', 'goodForChildren', 'accessibilityOptions'] })
    sel.website = place.websiteURI || null
    sel.phone = place.nationalPhoneNumber || null
    sel.hours = place.regularOpeningHours?.weekdayDescriptions || null
    sel.isOpen = place.regularOpeningHours?.isOpen?.() ?? null
    if (!sel.rating) sel.rating = place.rating || null
    if (!sel.ratingCount) sel.ratingCount = place.userRatingCount || null
    if (place.priceLevel) sel.priceLevel = place.priceLevel
    if (!sel.photo && place.photos?.[0]) sel.photo = place.photos[0].getURI?.({ maxWidth: 400 }) || null
    sel.summary = place.editorialSummary || null
    sel.googleMapsURI = place.googleMapsURI || null
    sel.dineIn = place.dineIn ?? null
    sel.takeout = place.takeout ?? null
    sel.delivery = place.delivery ?? null
    sel.reservable = place.reservable ?? null
    sel.servesBeer = place.servesBeer ?? null
    sel.servesWine = place.servesWine ?? null
    sel.outdoorSeating = place.outdoorSeating ?? null
    sel.goodForChildren = place.goodForChildren ?? null
    sel.wheelchair = place.accessibilityOptions?.wheelchairAccessibleEntrance ?? null
  } catch (e) { console.error('enrichPlace:', e) }
  return sel
}

const ALL_FIELDS = ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'websiteURI', 'nationalPhoneNumber', 'regularOpeningHours', 'editorialSummary', 'googleMapsURI', 'types', 'businessStatus', 'photos', 'dineIn', 'takeout', 'delivery', 'reservable', 'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBeer', 'servesWine', 'outdoorSeating', 'goodForChildren', 'accessibilityOptions']

export default function MapModal({ visible, onSelect, onClose, c: cProp, lang, init }) {
  const appCtx = useApp()
  const c = cProp || appCtx?.c || {}
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const mapDivRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Init map when visible
  useEffect(() => {
    if (!visible || mapRef.current) return
    loadMapsLib().then(() => {
      if (!mapDivRef.current || !window.google?.maps) return
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: 40.4168, lng: -3.7038 }, zoom: 5,
        disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy'
      })
      mapRef.current.addListener('click', e => {
        const lat = e.latLng.lat(), lng = e.latLng.lng()
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (res, status) => {
          if (status === 'OK' && res[0]) {
            handleSelectPlace({ name: res[0].address_components?.[0]?.long_name || '', address: res[0].formatted_address || '', lat, lng })
          }
        })
      })
    }).catch(err => console.error('MapModal init:', err))

    return () => {
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current)
        mapRef.current = null
      }
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null }
    }
  }, [visible])

  // Center on init query
  useEffect(() => {
    if (!visible || !init || !mapRef.current) return
    setQuery(init)
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: init }, (res, status) => {
      if (status === 'OK' && res[0]) {
        mapRef.current.setCenter(res[0].geometry.location)
        mapRef.current.setZoom(13)
      }
    })
  }, [visible, init])

  // Reset state on open
  useEffect(() => {
    if (visible) { setResults([]); setSelected(null); setSelecting(false) }
  }, [visible])

  const doSearch = async () => {
    if (!query.trim()) return
    try {
      await loadPlacesLib()
      const { Place } = google.maps.places
      const { places } = await Place.searchByText({ textQuery: query, fields: ALL_FIELDS, maxResultCount: 6 })
      setResults(places?.map(p => extractPlace(p)) || [])
    } catch {
      try {
        const service = new google.maps.places.PlacesService(mapRef.current)
        service.textSearch({ query, bounds: mapRef.current?.getBounds() }, (res, status) => {
          if (status === 'OK' && res) {
            setResults(res.slice(0, 6).map(r => ({
              name: r.name || '', address: r.formatted_address || '',
              lat: r.geometry.location.lat(), lng: r.geometry.location.lng(),
              placeId: r.place_id, rating: r.rating || null, ratingCount: r.user_ratings_total || null,
              priceLevel: r.price_level ?? null,
              photo: r.photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null,
              types: r.types || []
            })))
          }
        })
      } catch (e) { console.error('MapModal search fallback:', e) }
    }
  }

  const handleSelectPlace = (sel) => {
    setSelected(sel)
    setResults([])
    if (markerRef.current) markerRef.current.setMap(null)
    if (mapRef.current) {
      markerRef.current = new google.maps.Marker({ position: { lat: sel.lat, lng: sel.lng }, map: mapRef.current })
      mapRef.current.setCenter({ lat: sel.lat, lng: sel.lng })
      mapRef.current.setZoom(16)
    }
  }

  const handleConfirm = async () => {
    if (!selected) return
    setSelecting(true)
    const enriched = await enrichPlace(selected)
    setSelecting(false)
    onSelect(enriched)
  }

  if (!visible) return null

  const meta = (sel) => {
    let m = sel.rating ? `⭐ ${sel.rating}${sel.ratingCount ? ` (${sel.ratingCount})` : ''}` : ''
    if (sel.priceLevel) m += (m ? ' · ' : '') + '€'.repeat(sel.priceLevel)
    if (sel.isOpen !== null && sel.isOpen !== undefined) m += (m ? ' · ' : '') + (sel.isOpen ? 'Open' : 'Closed')
    return m
  }

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: c.CARD, borderBottom: `1px solid ${c.BD}` }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSearch() } }}
            placeholder="Search for a place... (press Enter)"
            autoFocus
            style={{ flex: 1, background: c.CARD2, border: `1px solid ${c.BD}`, borderRadius: '10px', padding: '10px 14px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={doSearch} style={{ background: c.A, border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#0A0A0A', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>🔍</button>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${c.BD}`, borderRadius: '10px', padding: '8px 14px', color: c.M, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✕</button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ background: c.CARD, borderBottom: `1px solid ${c.BD}`, maxHeight: '240px', overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { handleSelectPlace(r); setQuery(r.name) }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${c.BD}` }}
                onMouseEnter={e => e.currentTarget.style.background = c.CARD2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: '14px', color: c.T, fontWeight: '500' }}>{r.name}</div>
                <div style={{ fontSize: '12px', color: c.M }}>{r.address}</div>
                {(r.rating || r.priceLevel) && <div style={{ fontSize: '11px', color: c.M2, marginTop: '2px' }}>{meta(r)}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div ref={mapDivRef} style={{ flex: 1 }} />

        {/* Selected bar */}
        {selected && (
          <div style={{ padding: '14px 16px', background: c.CARD, borderTop: `1px solid ${c.BD}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', color: c.T, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
              <div style={{ fontSize: '12px', color: c.M, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.address}</div>
              {meta(selected) && <div style={{ fontSize: '11px', color: c.M2, marginTop: '2px' }}>{meta(selected)}</div>}
            </div>
            <button onClick={handleConfirm} disabled={selecting} style={{ padding: '10px 18px', background: c.A, color: '#0A0A0A', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: selecting ? 'wait' : 'pointer', fontSize: '14px', flexShrink: 0 }}>
              {selecting ? '...' : 'Select'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
