import React, { useEffect, useRef } from 'react'

const loadGM = () => {
  if (window.__loadGoogleMaps) window.__loadGoogleMaps()
  return new Promise(resolve => {
    if (window.google?.maps) return resolve()
    const check = setInterval(() => {
      if (window.google?.maps) { clearInterval(check); resolve() }
    }, 100)
    setTimeout(() => { clearInterval(check); resolve() }, 10000)
  })
}

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

// Persistent map container outside React
let _overlay = null
let _mapDiv = null
let _map = null
let _marker = null
let _onSelectCb = null
let _onCloseCb = null

const initOverlay = async () => {
  if (_overlay) return
  _overlay = document.createElement('div')
  _overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:none;flex-direction:column;'
  _overlay.id = 'gmap-overlay'
  document.body.appendChild(_overlay)

  // Header
  const header = document.createElement('div')
  header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;gap:8px;background:#141414;border-bottom:1px solid #2A2A2A;'
  _overlay.appendChild(header)

  const inputWrap = document.createElement('div')
  inputWrap.style.cssText = 'flex:1;position:relative;'
  header.appendChild(inputWrap)

  const input = document.createElement('input')
  input.id = 'gmap-input'
  input.placeholder = 'Search for a place... (press Enter)'
  input.style.cssText = 'width:100%;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:10px;padding:10px 36px 10px 14px;color:#F0EBE1;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;'
  inputWrap.appendChild(input)

  const searchBtn = document.createElement('button')
  searchBtn.textContent = '🔍'
  searchBtn.style.cssText = 'background:#CDFF6C;border:none;border-radius:10px;padding:8px 14px;color:#0A0A0A;cursor:pointer;font-size:14px;font-weight:700;'
  header.appendChild(searchBtn)

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = 'background:none;border:1px solid #2A2A2A;border-radius:10px;padding:8px 14px;color:#888;cursor:pointer;font-size:13px;font-weight:600;'
  closeBtn.onclick = () => { hideOverlay(); if (_onCloseCb) _onCloseCb() }
  header.appendChild(closeBtn)

  // Results
  const resultsList = document.createElement('div')
  resultsList.id = 'gmap-results'
  resultsList.style.cssText = 'background:#141414;border-bottom:1px solid #2A2A2A;max-height:240px;overflow-y:auto;display:none;'
  _overlay.appendChild(resultsList)

  // Map
  _mapDiv = document.createElement('div')
  _mapDiv.style.cssText = 'flex:1;'
  _overlay.appendChild(_mapDiv)

  // Selected bar
  const selBar = document.createElement('div')
  selBar.id = 'gmap-selbar'
  selBar.style.cssText = 'padding:14px 16px;background:#141414;border-top:1px solid #2A2A2A;display:none;align-items:center;gap:10px;'
  _overlay.appendChild(selBar)

  await loadGM()
  if(google.maps.importLibrary)await google.maps.importLibrary('maps')
  if(google.maps.importLibrary)await google.maps.importLibrary('places')

  _map = new google.maps.Map(_mapDiv, {
    center: { lat: 40.4168, lng: -3.7038 },
    zoom: 5,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy'
  })

  // Click on map
  _map.addListener('click', (e) => {
    const lat = e.latLng.lat(), lng = e.latLng.lng()
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (res, status) => {
      if (status === 'OK' && res[0]) {
        const r = res[0]
        selectPlace({ name: r.address_components?.[0]?.long_name || '', address: r.formatted_address || '', lat, lng })
        input.value = r.formatted_address || ''
      }
    })
  })

  // Search
  const doSearch = async () => {
    const q = input.value?.trim()
    if (!q) return
    try {
      if(google.maps.importLibrary)await google.maps.importLibrary('places');const { Place } = google.maps.places
      const allFields = ['displayName','formattedAddress','location','rating','userRatingCount','priceLevel','websiteURI','nationalPhoneNumber','regularOpeningHours','editorialSummary','googleMapsURI','types','businessStatus','photos','dineIn','takeout','delivery','reservable','servesBreakfast','servesLunch','servesDinner','servesBeer','servesWine','outdoorSeating','goodForChildren','accessibilityOptions']
      const { places } = await Place.searchByText({ textQuery: q, fields: allFields, maxResultCount: 6 })
      showResults(places?.map(p => extractPlace(p)) || [])
    } catch (err) {
      // searchByText not available, using fallback
      try {
        const service = new google.maps.places.PlacesService(_map)
        service.textSearch({ query: q, bounds: _map.getBounds() }, (res, status) => {
          if (status === 'OK' && res) {
            // Get basic results first, then enrich with details
            const basic = res.slice(0, 6).map(r => ({
              name: r.name || '', address: r.formatted_address || '',
              lat: r.geometry.location.lat(), lng: r.geometry.location.lng(),
              placeId: r.place_id, rating: r.rating || null, ratingCount: r.user_ratings_total || null,
              priceLevel: r.price_level ?? null,
              photo: r.photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null,
              types: r.types || []
            }))
            showResults(basic)
          }
        })
      } catch {}
    }
  }

  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch() } }
  searchBtn.onclick = doSearch
}

const showResults = (items) => {
  const el = document.getElementById('gmap-results')
  if (!el) return
  while (el.firstChild) el.removeChild(el.firstChild)
  if (items.length === 0) { el.style.display = 'none'; return }
  el.style.display = 'block'
  items.forEach(r => {
    const row = document.createElement('div')
    row.style.cssText = 'padding:12px 16px;cursor:pointer;border-bottom:1px solid #2A2A2A;'
    row.onmouseenter = () => { row.style.background = '#1C1C1C' }
    row.onmouseleave = () => { row.style.background = 'transparent' }
    const nameDiv = document.createElement('div')
    nameDiv.style.cssText = 'font-size:14px;color:#F0EBE1;font-weight:500'
    nameDiv.textContent = r.name
    const addrDiv = document.createElement('div')
    addrDiv.style.cssText = 'font-size:12px;color:#888'
    addrDiv.textContent = r.address
    row.appendChild(nameDiv)
    row.appendChild(addrDiv)
    if (r.rating || r.priceLevel) {
      const metaDiv = document.createElement('div')
      metaDiv.style.cssText = 'font-size:11px;margin-top:2px'
      let meta = r.rating ? `⭐ ${r.rating}` : ''
      if (r.ratingCount) meta += ` (${r.ratingCount})`
      if (r.priceLevel) meta += ` · ${'€'.repeat(r.priceLevel)}`
      metaDiv.textContent = meta
      row.appendChild(metaDiv)
    }
    row.onclick = () => { selectPlace(r); document.getElementById('gmap-input').value = r.name; document.getElementById('gmap-results').style.display = 'none' }
    el.appendChild(row)
  })
}

let _pendingSel = null

const enrichPlace = async (sel) => {
  if (!sel.placeId) return sel
  try {
    if(google.maps.importLibrary)await google.maps.importLibrary('places');const { Place } = google.maps.places
    const place = new Place({ id: sel.placeId })
    await place.fetchFields({ fields: ['displayName','websiteURI','nationalPhoneNumber','regularOpeningHours','priceLevel','rating','userRatingCount','photos','editorialSummary','googleMapsURI','dineIn','takeout','delivery','reservable','servesBreakfast','servesLunch','servesDinner','servesBeer','servesWine','outdoorSeating','goodForChildren','accessibilityOptions'] })
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
  } catch {}
  return sel
}

const selectPlace = (sel) => {
  _pendingSel = sel
  if (_marker) _marker.setMap(null)
  _marker = new google.maps.Marker({ position: { lat: sel.lat, lng: sel.lng }, map: _map })
  _map.setCenter({ lat: sel.lat, lng: sel.lng })
  _map.setZoom(16)
  const bar = document.getElementById('gmap-selbar')
  if (bar) {
    bar.style.display = 'flex'
    const wrap = document.createElement('div')
    wrap.style.cssText = 'flex:1;min-width:0'
    const nameEl = document.createElement('div')
    nameEl.style.cssText = 'font-size:14px;color:#F0EBE1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
    nameEl.textContent = sel.name
    const addrEl = document.createElement('div')
    addrEl.style.cssText = 'font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
    addrEl.textContent = sel.address
    wrap.appendChild(nameEl)
    wrap.appendChild(addrEl)
    let meta = sel.rating ? `⭐ ${sel.rating}${sel.ratingCount ? ` (${sel.ratingCount})` : ''}` : ''
    if (sel.priceLevel) meta += (meta ? ' · ' : '') + '€'.repeat(sel.priceLevel)
    if (sel.isOpen !== null) meta += (meta ? ' · ' : '') + (sel.isOpen ? 'Open' : 'Closed')
    if (meta) {
      const metaEl = document.createElement('div')
      metaEl.style.cssText = 'font-size:11px;color:#888;margin-top:2px'
      metaEl.textContent = meta
      wrap.appendChild(metaEl)
    }
    while (bar.firstChild) bar.removeChild(bar.firstChild)
    bar.appendChild(wrap)
    const btn = document.createElement('button')
    btn.textContent = 'Select'
    btn.style.cssText = 'padding:10px 18px;background:#CDFF6C;color:#0A0A0A;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;flex-shrink:0;'
    btn.onclick = async () => { btn.textContent='...'; const enriched = await enrichPlace(_pendingSel || sel); hideOverlay(); if (_onSelectCb) _onSelectCb(enriched) }
    bar.appendChild(btn)
  }
}

const showOverlay = (initQuery) => {
  if (!_overlay) return
  _overlay.style.display = 'flex'
  const input = document.getElementById('gmap-input')
  if (input) { input.value = initQuery || ''; input.focus() }
  const results = document.getElementById('gmap-results')
  if (results) { results.style.display = 'none'; while (results.firstChild) results.removeChild(results.firstChild) }
  const bar = document.getElementById('gmap-selbar')
  if (bar) { bar.style.display = 'none' }
  if (_marker) { _marker.setMap(null); _marker = null }
  if (_map) {
    google.maps.event.trigger(_map, 'resize')
    if (initQuery) {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ address: initQuery }, (res, status) => {
        if (status === 'OK' && res[0]) {
          const loc = res[0].geometry.location
          _map.setCenter(loc); _map.setZoom(13)
        }
      })
    }
  }
}

const hideOverlay = () => {
  if (_overlay) _overlay.style.display = 'none'
}

export default function MapModal({ visible, onSelect, onClose, c, lang, init }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (!visible) return
    _onSelectCb = onSelect
    _onCloseCb = onClose
    if (!initialized.current) {
      initialized.current = true
      initOverlay().then(() => showOverlay(init))
    } else {
      showOverlay(init)
    }
  }, [visible, init])

  useEffect(() => {
    if (!visible) hideOverlay()
  }, [visible])

  // This component renders NOTHING — the map lives entirely outside React
  return null
}
