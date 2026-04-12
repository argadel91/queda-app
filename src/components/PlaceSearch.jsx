import React, { useState, useRef, useEffect } from 'react'
import { loadGoogleMaps, loadPlacesLib, loadMapsLib } from '../lib/googleMaps.js'

export default function PlaceSearch({ value, onSelect, placeholder, c, lang }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markerRef = useRef(null)
  const debRef = useRef(null)

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const timer = setTimeout(() => {
      if (!mapRef.current) return
      loadMapsLib().then(() => {
        if (!window.google?.maps || !mapRef.current) return
        const center = value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : { lat: 40.4168, lng: -3.7038 }
        const zoom = value?.lat ? 15 : 6
        mapObj.current = new google.maps.Map(mapRef.current, {
          center, zoom, disableDefaultUI: true, zoomControl: true,
          gestureHandling: 'greedy', backgroundColor: '#1A1A1A'
        })
        if (value?.lat && value?.lng) {
          markerRef.current = new google.maps.Marker({
            position: { lat: value.lat, lng: value.lng }, map: mapObj.current,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#CDFF6C', fillOpacity: 1, strokeColor: '#CDFF6C', strokeWeight: 2 }
          })
        }
        // Click to select
        mapObj.current.addListener('click', e => {
          const lat = e.latLng.lat(), lng = e.latLng.lng()
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (res, status) => {
            if (status === 'OK' && res[0]) {
              pickResult({ name: res[0].address_components?.[0]?.long_name || '', address: res[0].formatted_address || '', lat, lng, placeId: res[0].place_id })
            }
          })
        })
      }).catch(err => console.error('PlaceSearch map init:', err))
    }, 100)
    return () => {
      clearTimeout(timer)
      if (mapObj.current) {
        google.maps.event.clearInstanceListeners(mapObj.current)
        mapObj.current = null
      }
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null }
    }
  }, [])

  const search = async q => {
    if (debRef.current) clearTimeout(debRef.current)
    if (!q?.trim()) return
    debRef.current = setTimeout(async () => {
      try {
        await loadPlacesLib()
        const { Place } = google.maps.places
        const { places } = await Place.searchByText({
          textQuery: q,
          fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'photos', 'placeId'],
          maxResultCount: 5
        })
        if (places?.length) {
          setResults(places.map(p => ({
            name: p.displayName || '', address: p.formattedAddress || '',
            lat: p.location?.lat(), lng: p.location?.lng(),
            rating: p.rating || null, ratingCount: p.userRatingCount || null,
            priceLevel: p.priceLevel ?? null,
            photo: p.photos?.[0]?.getURI?.({ maxWidth: 400 }) || null,
            placeId: p.id || null
          })))
          setOpen(true)
        } else { setResults([]); setOpen(false) }
      } catch {
        try {
          const service = new google.maps.places.PlacesService(mapObj.current || document.createElement('div'))
          service.textSearch({ query: q }, (res, status) => {
            if (status === 'OK' && res) {
              setResults(res.slice(0, 5).map(r => ({
                name: r.name || '', address: r.formatted_address || '',
                lat: r.geometry.location.lat(), lng: r.geometry.location.lng(),
                rating: r.rating || null, ratingCount: r.user_ratings_total || null,
                priceLevel: r.price_level ?? null,
                photo: r.photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null,
                placeId: r.place_id || null
              })))
              setOpen(true)
            } else { setResults([]); setOpen(false) }
          })
        } catch { setResults([]); setOpen(false) }
      }
    }, 300)
  }

  const pickResult = async r => {
    setResults([]); setOpen(false)
    if (inputRef.current) inputRef.current.value = r.name
    // Enrich with details
    if (r.placeId && window.google?.maps) {
      try {
        await loadPlacesLib()
        const { Place } = google.maps.places
        const place = new Place({ id: r.placeId })
        await place.fetchFields({ fields: ['websiteURI', 'nationalPhoneNumber', 'regularOpeningHours', 'editorialSummary', 'googleMapsURI', 'types'] })
        r.website = place.websiteURI || null
        r.phone = place.nationalPhoneNumber || null
        r.hours = place.regularOpeningHours?.weekdayDescriptions || null
        r.summary = place.editorialSummary || null
        r.googleMapsURI = place.googleMapsURI || null
      } catch (e) { console.error('PlaceSearch enrich:', e) }
    }
    // Update map
    if (mapObj.current && r.lat && r.lng) {
      mapObj.current.setCenter({ lat: r.lat, lng: r.lng })
      mapObj.current.setZoom(15)
      if (markerRef.current) markerRef.current.setMap(null)
      markerRef.current = new google.maps.Marker({
        position: { lat: r.lat, lng: r.lng }, map: mapObj.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#CDFF6C', fillOpacity: 1, strokeColor: '#CDFF6C', strokeWeight: 2 }
      })
    }
    onSelect(r)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <input ref={inputRef} defaultValue="" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(inputRef.current?.value) } }} placeholder={placeholder} style={{ flex: 1, background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', padding: '10px 14px', color: c.T, fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={() => search(inputRef.current?.value)} style={{ background: c.A, border: 'none', borderRadius: '10px', padding: '10px 14px', color: '#0A0A0A', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>🔍</button>
      </div>
      {open && results.length > 0 && (
        <div style={{ background: c.CARD, border: `1px solid ${c.BD}`, borderRadius: '10px', marginBottom: '8px', maxHeight: '200px', overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => pickResult(r)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? `1px solid ${c.BD}` : 'none' }} onMouseEnter={e => e.currentTarget.style.background = c.CARD2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '14px', color: c.T, fontWeight: '500' }}>{r.name}</div>
                {r.rating && <span style={{ fontSize: '11px', color: c.A }}>⭐{r.rating}</span>}
              </div>
              <div style={{ fontSize: '12px', color: c.M2 }}>{r.address}</div>
            </div>
          ))}
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${c.BD}`, background: c.CARD2 }} />
    </div>
  )
}
