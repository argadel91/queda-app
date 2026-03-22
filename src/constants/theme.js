export const getSysTheme = () => window.matchMedia?.('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'
export const applyTheme = t => { document.body.className = t }
export const C = t => t === 'dark'
  ? { A:'#CDFF6C', BG:'#0A0A0A', CARD:'#141414', CARD2:'#1C1C1C', BD:'#2A2A2A', T:'#F0EBE1', M:'#999', M2:'#888' }
  : { A:'#4A8800', BG:'#F5F4F1', CARD:'#FFFFFF', CARD2:'#EEECE8', BD:'#DDDAD3', T:'#1A1A1A', M:'#666', M2:'#666' }

export const MC_DARK = { social:'#CDFF6C', intimate:'#F472B6', professional:'#60A5FA' }
export const MC_LIGHT = { social:'#3A7D00', intimate:'#B5006E', professional:'#1565C0' }
export const getMC = (mode, c) => {
  const isDark = c?.BG === '#0A0A0A'
  return (isDark ? MC_DARK : MC_LIGHT)[mode || 'social'] || c?.A || '#CDFF6C'
}
