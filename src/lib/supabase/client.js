import { createClient } from '@supabase/supabase-js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY

export const db = createClient(SB_URL, SB_KEY, {
  auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})
if (typeof window !== 'undefined') window.__supabaseClient = db

let _toastFn = null
export const setToastFn = fn => { _toastFn = fn }
export const showErr = msg => { if (_toastFn) _toastFn(msg) }
export const showToast = (msg, type = 'success') => { if (_toastFn) _toastFn(msg, type) }
