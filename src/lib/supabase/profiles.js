import { db, showErr } from './client.js'

export const loadProfile = async uid => {
  try {
    const { data } = await db.from('profiles').select('*').eq('id', uid).maybeSingle()
    return data
  } catch (e) { console.error('loadProfile:', e); return null }
}

export const saveProfile = async (uid, prof) => {
  try {
    const { error } = await db.from('profiles').upsert({ id: uid, ...prof, updated_at: new Date().toISOString() })
    if (error) throw error
  } catch (e) { showErr('Error saving profile.'); throw e }
}

export const fetchPublicProfile = async uid => {
  try {
    const { data } = await db.from('profiles').select('id,name,username,bio,photo_url,birthdate,gender,interests,city,created_at').eq('id', uid).maybeSingle()
    return data
  } catch (e) { console.error('fetchPublicProfile:', e); return null }
}

export const uploadAvatar = async (uid, file) => {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  if (!ALLOWED.includes(file.type)) { showErr('Only JPG, PNG or WebP images allowed.'); return null }
  if (file.size > MAX_SIZE) { showErr('Image too large. Max 2MB.'); return null }
  const ext = file.name.split('.').pop()
  const path = `${uid}/avatar.${ext}`
  const { error } = await db.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) { showErr('Error uploading photo.'); throw error }
  const { data } = db.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
