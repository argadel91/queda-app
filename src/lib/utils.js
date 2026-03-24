const BAD_WORDS = ['FUCK','SHIT','CUNT','COCK','DICK','PUTA','MIER','CONO','JODE','CULO','PENE','POLLA','NAZI','KKKK']
export const genId = () => { let id; do { id = (Math.random().toString(36).substring(2,6)+Math.random().toString(36).substring(2,6)).substring(0,8).toUpperCase() } while (BAD_WORDS.some(w => id.includes(w))); return id }
export const toISO = d => d.toISOString().split('T')[0]
export const dayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
export const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
export const fmtDate = (iso, lang) => new Date(iso+'T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'es-ES', { weekday:'long', day:'numeric', month:'long' })
export const fmtShort = (iso, lang) => new Date(iso+'T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'es-ES', { weekday:'short', day:'numeric', month:'short' })
export const fmtMonthYear = (y, m, lang) => new Date(y,m,1).toLocaleDateString(lang==='en'?'en-GB':'es-ES', { month:'long', year:'numeric' })
export const daysUntil = iso => Math.round((new Date(iso+'T12:00:00') - dayStart()) / 86400000)
