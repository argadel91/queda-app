// Seed script: creates 3 test users + 4 plans with participants.
// Run: node scripts/seed-test.mjs
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1) }

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genId = () => Array.from(randomBytes(10), b => CHARS[b % CHARS.length]).join('')

const USERS = [
  { email: 'bot1@queda.test', username: 'Alex', gender: 'male', age: 29 },
  { email: 'bot2@queda.test', username: 'Jamie', gender: 'male', age: 33 },
  { email: 'bot3@queda.test', username: 'Sara', gender: 'female', age: 27 },
]

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const dayAfter = new Date(Date.now() + 172800000).toISOString().slice(0, 10)

async function main() {
  console.log('Creating test users...')
  const userIds = []
  for (const u of USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: 'TestPass123!',
      email_confirm: true,
    })
    if (error && error.message.includes('already been registered')) {
      const { data: list } = await db.auth.admin.listUsers()
      const existing = list.users.find(x => x.email === u.email)
      if (existing) { userIds.push(existing.id); console.log(`  ${u.username} already exists (${existing.id})`); continue }
    }
    if (error) { console.error(`  Failed ${u.email}:`, error.message); continue }
    userIds.push(data.user.id)
    console.log(`  ${u.username} created (${data.user.id})`)

    // Create profile
    const birthYear = new Date().getFullYear() - u.age
    await db.from('profiles').upsert({
      id: data.user.id,
      username: u.username,
      gender: u.gender,
      birthdate: `${birthYear}-01-01`,
      token_balance: 6,
    })
  }

  if (userIds.length < 2) { console.error('Need at least 2 users'); process.exit(1) }

  console.log('\nCreating test plans...')
  const plans = [
    { title: '5-a-side football', category: 'sports', place_name: 'Platt Fields Park', lat: 53.448, lng: -2.222, date: tomorrow, time: '18:00:00', capacity: 10, gender_filter: 'male', join_mode: 'open' },
    { title: 'Coffee & boardgames', category: 'games', place_name: 'Takk Coffee', lat: 53.476, lng: -2.245, date: tomorrow, time: '11:00:00', capacity: 6, gender_filter: 'mixed', join_mode: 'open' },
    { title: 'Morning run', category: 'sports', place_name: 'Didsbury Park', lat: 53.410, lng: -2.228, date: dayAfter, time: '07:30:00', capacity: 8, gender_filter: 'mixed', join_mode: 'open' },
    { title: 'Pub quiz night', category: 'social', place_name: 'The Albert Square Chop House', lat: 53.479, lng: -2.244, date: dayAfter, time: '20:00:00', capacity: 8, gender_filter: 'mixed', join_mode: 'approval' },
  ]

  for (let i = 0; i < plans.length; i++) {
    const creatorIdx = i % userIds.length
    const planId = genId()
    const { error } = await db.from('plans').insert({
      id: planId,
      user_id: userIds[creatorIdx],
      ...plans[i],
      place_address: 'Manchester, UK',
      cancellation_deadline_hours: 24,
      status: 'active',
    })
    if (error) { console.error(`  Failed "${plans[i].title}":`, error.message); continue }
    console.log(`  "${plans[i].title}" by ${USERS[creatorIdx].username} (${planId})`)

    // Log free create
    await db.from('tokens_ledger').insert({
      user_id: userIds[creatorIdx],
      amount: 0,
      reason: 'create_plan_free',
      related_plan_id: planId,
      balance_after: 6,
    })

    // Add 1-2 other users as participants
    for (let j = 0; j < userIds.length; j++) {
      if (j === creatorIdx) continue
      if (Math.random() > 0.6) continue
      await db.from('plan_participants').insert({
        plan_id: planId,
        user_id: userIds[j],
        status: 'joined',
      })
      await db.from('tokens_ledger').insert({
        user_id: userIds[j],
        amount: -1,
        reason: 'join_plan_deposit',
        related_plan_id: planId,
        balance_after: 5,
      })
      console.log(`    + ${USERS[j].username} joined`)
    }
  }

  console.log('\nDone! Test users can log in with password: TestPass123!')
  console.log('Emails:', USERS.map(u => u.email).join(', '))
}

main().catch(console.error)
