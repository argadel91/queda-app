// Test all token flows end-to-end.
// Run: node --env-file=.env scripts/test-flows.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY
if (!url || !serviceKey) { console.error('Missing env'); process.exit(1) }

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function loginAs(email) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'TestPass123!' })
  if (error) throw new Error(`Login ${email}: ${error.message}`)
  return { client, user: data.user }
}

async function getBalance(userId) {
  const { data } = await admin.from('profiles').select('token_balance').eq('id', userId).single()
  return data.token_balance
}

async function log(label, fn) {
  process.stdout.write(`  ${label}...`)
  try {
    const result = await fn()
    console.log(` ✅${result ? ` (${result})` : ''}`)
  } catch (e) {
    console.log(` ❌ ${e.message}`)
  }
}

async function main() {
  const alex = await loginAs('bot1@queda.test')
  const jamie = await loginAs('bot2@queda.test')
  const sara = await loginAs('bot3@queda.test')

  // Reset balances to 6
  for (const u of [alex, jamie, sara]) {
    await admin.from('profiles').update({ token_balance: 6 }).eq('id', u.user.id)
  }

  // Find plans
  const { data: plans } = await admin.from('plans').select('id, title, user_id').eq('status', 'active')
  const pubQuiz = plans.find(p => p.title === 'Pub quiz night')
  const football = plans.find(p => p.title === '5-a-side football')
  const coffee = plans.find(p => p.title === 'Coffee & boardgames')

  console.log('\n1. APPROVE FLOW (Pub quiz — approval mode)')
  // Jamie already requested in seed, check if pending
  const { data: pending } = await admin.from('plan_participants')
    .select('status').eq('plan_id', pubQuiz.id).eq('user_id', jamie.user.id).single()

  if (pending?.status === 'pending') {
    await log('Alex approves Jamie', async () => {
      const { error } = await alex.client.from('plan_participants')
        .update({ status: 'joined' }).eq('plan_id', pubQuiz.id).eq('user_id', jamie.user.id)
      if (error) throw error
      return 'status → joined'
    })
  } else {
    console.log(`  Jamie status: ${pending?.status || 'not found'}, skipping approve`)
  }

  console.log('\n2. JOIN FLOW (Sara joins pub quiz)')
  await log('Sara joins pub quiz (-1 token)', async () => {
    const { error } = await sara.client.rpc('join_plan_with_deposit', {
      p_plan_id: pubQuiz.id, p_user_id: sara.user.id
    })
    if (error) throw error
    const bal = await getBalance(sara.user.id)
    return `balance: ${bal}`
  })

  console.log('\n3. LEAVE FLOW (Sara leaves pub quiz)')
  await log('Sara leaves pub quiz (+1 refund)', async () => {
    const { error } = await sara.client.rpc('leave_plan', {
      p_plan_id: pubQuiz.id, p_user_id: sara.user.id
    })
    if (error) throw error
    const bal = await getBalance(sara.user.id)
    return `balance: ${bal}`
  })

  console.log('\n4. CANCEL FLOW (Jamie cancels coffee & boardgames)')
  if (coffee && coffee.user_id === jamie.user.id) {
    await log('Jamie cancels coffee plan (refunds Sara)', async () => {
      const { error } = await jamie.client.rpc('cancel_plan', {
        p_plan_id: coffee.id, p_user_id: jamie.user.id
      })
      if (error) throw error
      const { data: plan } = await admin.from('plans').select('status').eq('id', coffee.id).single()
      return `plan status: ${plan.status}`
    })
  } else {
    console.log('  Skipped — coffee plan not owned by Jamie')
  }

  console.log('\n5. CHECKOUT FLOW (football — set to past, Alex checks out)')
  if (football) {
    // Set plan date to yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await admin.from('plans').update({ date: yesterday, time: '18:00:00', status: 'active' }).eq('id', football.id)
    // Mark Jamie attended, Sara no-show
    const { data: parts } = await admin.from('plan_participants')
      .select('user_id, status').eq('plan_id', football.id).eq('status', 'joined')

    for (const p of (parts || [])) {
      const attended = p.user_id === jamie.user.id
      await admin.from('plan_participants').update({ attended }).eq('plan_id', football.id).eq('user_id', p.user_id)
    }

    await log('Alex finalises football (Jamie attended, Sara no-show)', async () => {
      const { error } = await alex.client.rpc('process_plan_checkout', {
        p_plan_id: football.id, p_organizer_id: alex.user.id, p_auto: false
      })
      if (error) throw error
      const { data: plan } = await admin.from('plans').select('status, checked_out_at').eq('id', football.id).single()
      return `status: ${plan.status}, checked_out: ${!!plan.checked_out_at}`
    })

    await log('Jamie balance (attended → refund +1)', async () => {
      return `${await getBalance(jamie.user.id)}`
    })
    await log('Sara balance (no-show → lost 1)', async () => {
      return `${await getBalance(sara.user.id)}`
    })
    await log('Alex balance (organizer +1)', async () => {
      return `${await getBalance(alex.user.id)}`
    })
  }

  console.log('\n6. FINAL BALANCES')
  for (const [name, u] of [['Alex', alex], ['Jamie', jamie], ['Sara', sara]]) {
    const bal = await getBalance(u.user.id)
    console.log(`  ${name}: ${bal} tokens`)
  }

  // Token ledger summary
  console.log('\n7. LEDGER ENTRIES')
  const { data: ledger } = await admin.from('tokens_ledger')
    .select('amount, reason, balance_after, created_at')
    .in('user_id', [alex.user.id, jamie.user.id, sara.user.id])
    .order('created_at', { ascending: true })
    .limit(30)
  for (const e of (ledger || [])) {
    console.log(`  ${e.amount >= 0 ? '+' : ''}${e.amount} ${e.reason} → bal ${e.balance_after}`)
  }

  console.log('\n✅ All flows tested.')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
