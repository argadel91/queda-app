let _promise = null

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve()
  if (_promise) return _promise
  if (window.__loadGoogleMaps) window.__loadGoogleMaps()
  _promise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return }
    const origReady = window.__gmReady
    window.__gmReady = () => { if (origReady) origReady(); resolve() }
    setTimeout(() => reject(new Error('Google Maps load timeout')), 15000)
  }).catch(err => { _promise = null; throw err })
  return _promise
}

export async function loadPlacesLib() {
  await loadGoogleMaps()
  if (google.maps.importLibrary) await google.maps.importLibrary('places')
}

export async function loadMapsLib() {
  await loadGoogleMaps()
  if (google.maps.importLibrary) await google.maps.importLibrary('maps')
}
