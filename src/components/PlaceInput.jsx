import React, { useRef, useCallback, useState } from 'react'
import { loadPlacesLib } from '../lib/googleMaps.js'
import { theme as t } from '../theme.js'

// Minimal Google Places autocomplete input.
// Returns { name, address, lat, lng } via onSelect.
export default function PlaceInput({ value, onSelect, style }) {
  const inputRef = useRef(null)
  const [results, setResults] = useState([])
  const debRef = useRef(null)

  const search = useCallback(async q => {
    if (!q?.trim()) { setResults([]); return }
    try {
      await loadPlacesLib()
      const { Place } = google.maps.places
      const { places } = await Place.searchByText({ textQuery: q, maxResultCount: 5 })
      setResults((places || []).map(p => ({
        name: p.displayName,
        address: p.formattedAddress,
        lat: p.location?.lat(),
        lng: p.location?.lng(),
      })))
    } catch { setResults([]) }
  }, [])

  const onInput = e => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => search(e.target.value), 350)
  }

  const pick = r => {
    onSelect(r)
    if (inputRef.current) inputRef.current.value = r.name
    setResults([])
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: 10,
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
              background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: 10,
              padding: '12px 14px', color: t.text, fontSize: 14, fontFamily: t.font, outline: 'none',
            }}
          />
          {results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
              background: t.bgElev, border: `1px solid ${t.border}`, borderRadius: 10,
              maxHeight: 220, overflowY: 'auto',
            }}>
              {results.map((r, i) => (
                <div key={i} onClick={() => pick(r)} style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? `1px solid ${t.border}` : 'none',
                }}>
                  <div style={{ fontSize: 14, color: t.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: t.textDim }}>{r.address}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
