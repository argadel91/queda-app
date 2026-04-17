import { db } from './supabase.js'

// Requires Realtime enabled on the `tokens_ledger` table in Supabase dashboard.
// Every SECURITY DEFINER function (_apply_token_delta) inserts a row, so one
// subscription to INSERTs gives us balance updates for free (balance_after column).

export async function getTokenBalance(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('token_balance')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.token_balance ?? 0
}

export async function getTokenHistory(userId, limit = 50) {
  const { data, error } = await db
    .from('tokens_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export function subscribeToBalance(userId, onLedgerInsert) {
  const channelName = `tokens:${userId}:${Date.now()}`
  const channel = db.channel(channelName)
  channel.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tokens_ledger',
    filter: `user_id=eq.${userId}`,
  }, payload => onLedgerInsert(payload.new))
  channel.subscribe()
  return () => { db.removeChannel(channel) }
}
