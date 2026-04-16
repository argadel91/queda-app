const BAD_WORDS = ['FUCK','SHIT','CUNT','COCK','DICK','PUTA','MIER','CONO','JODE','CULO','PENE','POLLA','NAZI','KKKK']
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const genId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let id
  do { id = Array.from(bytes, b => CHARS[b % CHARS.length]).join('') } while (BAD_WORDS.some(w => id.includes(w)))
  return id
}
