import React, { useRef, useCallback, useState } from 'react'
import { loadPlacesLib } from '../lib/googleMaps.js'
import { theme as t } from '../theme.js'

export default function PlaceInput({ value, onSelect, style }) {
  const inputRef = useRef(null)
  const [results, setResults] = useState([])
  const debRef = useRef(null)
  const serviceRef = useRef(null)

  const search = useCallback(async q => {
    if (!q?.trim()) { setResults([]); return }
    try {
      await loadPlacesLib()
      if (!serviceRef.current) {
        serviceRef.current = new google.maps.places.AutocompleteService()
      }
      serviceRef.current.getPlacePredictions({ input: q }, (predictions, status) => {
        if (status !== 'OK' || !predictions) { setResults([]); return }
        setResults(predictions.map(p => ({
          placeId: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          address: p.description,
        })))
      })
    } catch (e) {
      console.error('PlaceInput search:', e)
      setResults([])
    }
  }, [])

  const pick = useCallback(async r => {
    setResults([])
    if (inputRef.current) inputRef.current.value = r.name
    try {
      await loadPlacesLib()
      const svc = new google.maps.places.PlacesService(document.createElement('div'))
      svc.getDetails({ placeId: r.placeId, fields: ['geometry', 'name', 'formatted_address'] }, (place, status) => {
        if (status !== 'OK' || !place) { onSelect({ ...r, lat: null, lng: null }); return }
        onSelect({
          name: place.name || r.name,
          address: place.formatted_address || r.address,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        })
      })
    } catch {
      onSelect({ ...r, lat: null, lng: null })
    }
  }, [onSelect])

  const onInput = e => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => search(e.target.value), 300)
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.name}</div>
            {value.address && <div style={{ fontSize: 11, color: t.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.address}</div>}
          </div>
          <button onClick={() => onSelect(null)} type="button" style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            placeholder="Search a place…"
            onInput={onInput}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
              padding: '13px 14px', color: t.text, fontSize: 14, fontFamily: t.font, outline: 'none',
            }}
          />
          {results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
              maxHeight: 240, overflowY: 'auto',
            }}>
              {results.map((r, i) => (
                <div key={r.placeId || i} onClick={() => pick(r)} style={{
                  padding: '12px 14px', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? `1px solid ${t.border}` : 'none',
                }}>
                  <div style={{ fontSize: 14, color: t.text }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>{r.address}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
