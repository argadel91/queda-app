const BAD_WORDS = ['FUCK','SHIT','CUNT','COCK','DICK','PUTA','MIER','CONO','JODE','CULO','PENE','POLLA','NAZI','KKKK']
export const genId = () => { let id; do { id = (Math.random().toString(36).substring(2,6)+Math.random().toString(36).substring(2,6)).substring(0,8).toUpperCase() } while (BAD_WORDS.some(w => id.includes(w))); return id }
export const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export const dayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
export const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const LOC={es:'es-ES',en:'en-GB',pt:'pt-PT',fr:'fr-FR',de:'de-DE',it:'it-IT'}
const loc=lang=>LOC[lang]||LOC.en
export const fmtDate = (iso, lang) => new Date(iso+'T12:00:00').toLocaleDateString(loc(lang), { weekday:'long', day:'numeric', month:'long' })
export const fmtShort = (iso, lang) => new Date(iso+'T12:00:00').toLocaleDateString(loc(lang), { weekday:'short', day:'numeric', month:'short' })
export const fmtMonthYear = (y, m, lang) => new Date(y,m,1).toLocaleDateString(loc(lang), { month:'long', year:'numeric' })
export const daysUntil = iso => Math.round((new Date(iso+'T12:00:00') - dayStart()) / 86400000)
export const fmtTime = t => { if(!t)return''; const[h,m]=t.split(':').map(Number); if(isNaN(h))return t; return`${t} (${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'})` }
export const durToMins=d=>({'30min':30,'1h':60,'1h30':90,'2h':120,'3h':180,'4h+':240}[d]||0);
export const calcEnd=(start,dur)=>{if(!start||!dur)return'';const[h,m]=start.split(':').map(Number);const mins=durToMins(dur);if(!mins)return'';const d=new Date(2000,0,1,h,m+mins);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
