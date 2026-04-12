// Re-export from modular supabase files for backwards compatibility
export { db, setToastFn, showErr, showToast } from './supabase/client.js'
export { loadProfile, saveProfile, fetchPublicProfile, uploadAvatar } from './supabase/profiles.js'
export { createPlan, fetchPlan, fetchPlans, updatePlan, deletePlan } from './supabase/plans.js'
export { fetchParticipants, joinPlan, requestJoin, updateParticipant, leavePlan } from './supabase/participants.js'
export { fetchMessages, sendMessage } from './supabase/messages.js'
