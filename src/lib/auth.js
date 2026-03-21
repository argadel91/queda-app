import { db, loadProfile, saveProfile } from './supabase.js'

export const authSignUp = async (email, password) => {
  const { data, error } = await db.auth.signUp({ email, password })
  return { data, error }
}

export const authSignIn = async (email, password) => {
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const authSignOut = async () => {
  await db.auth.signOut()
}

export const authResetPassword = async email => {
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  })
  return { error }
}

export const getSession = async () => {
  const { data } = await db.auth.getSession()
  return data?.session || null
}

export const getOrCreateProfile = async (user, lang = 'es') => {
  let prof = await loadProfile(user.id)
  if (!prof) {
    prof = {
      name: user.email.split('@')[0],
      email: user.email,
      lang,
      contacts: []
    }
    await saveProfile(user.id, prof)
  }
  return prof
}
