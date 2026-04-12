import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function reset() {
  console.log('Deleting messages...')
  const { error: e1 } = await admin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e1) console.error('  messages:', e1.message); else console.log('  done')

  console.log('Deleting plan_participants...')
  const { error: e2 } = await admin.from('plan_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e2) console.error('  plan_participants:', e2.message); else console.log('  done')

  console.log('Deleting plans...')
  const { error: e3 } = await admin.from('plans').delete().neq('id', '')
  if (e3) console.error('  plans:', e3.message); else console.log('  done')

  console.log('Deleting profiles...')
  const { error: e4 } = await admin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e4) console.error('  profiles:', e4.message); else console.log('  done')

  console.log('Deleting auth users...')
  const { data: { users }, error: e5 } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (e5) { console.error('  listUsers:', e5.message); return }
  console.log(`  found ${users.length} users`)
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error) console.error(`  failed ${u.email}:`, error.message)
    else console.log(`  deleted ${u.email}`)
  }

  // Verify
  console.log('\nVerifying...')
  const { count: c1 } = await admin.from('messages').select('*', { count: 'exact', head: true })
  const { count: c2 } = await admin.from('plan_participants').select('*', { count: 'exact', head: true })
  const { count: c3 } = await admin.from('plans').select('*', { count: 'exact', head: true })
  const { count: c4 } = await admin.from('profiles').select('*', { count: 'exact', head: true })
  const { data: { users: remaining } } = await admin.auth.admin.listUsers({ perPage: 1 })
  console.log(`  messages: ${c1}, participants: ${c2}, plans: ${c3}, profiles: ${c4}, auth users: ${remaining.length}`)
  console.log('\nDone.')
}

reset().catch(console.error)
