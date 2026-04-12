import { db } from './supabase.js'

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

export const authSignInWithProvider = async (provider) => {
  const { data, error } = await db.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + '/auth/callback'
    }
  })
  return { data, error }
}

export const authResetPassword = async email => {
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password'
  })
  return { error }
}

export const getSession = async () => {
  const { data } = await db.auth.getSession()
  return data?.session || null
}
