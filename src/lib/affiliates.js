// Affiliate link helpers
// To activate: replace empty strings with your affiliate IDs
const AFF = {
  booking: { id: '', param: 'aid' },
  airbnb: { id: '', param: 'c' },
  skyscanner: { id: '', param: 'associateId' },
  blablacar: { id: '', param: 'comuto_cmkt' },
  trainline: { id: '', param: 'utm_source' },
  uber: { referralCode: '' },
  travala: { id: '', param: 'ref' },
  hotels: { id: '', param: 'rffrid' },
}

export const affLink = (base, provider) => {
  const cfg = AFF[provider]
  if (!cfg || !cfg.id) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${cfg.param}=${cfg.id}`
}

export const uberLink = () => {
  const code = AFF.uber.referralCode
  return code ? `https://m.uber.com/?invite_code=${code}` : 'https://m.uber.com/'
}

// UTM tracking for all outbound links
export const withUtm = (url, source = 'queda', medium = 'app', campaign = 'plan') => {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`
}
