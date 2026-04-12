import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Anon client for auth operations
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
// Service role client to bypass RLS for user_plans
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const NAMES = ['Ana', 'Carlos', 'Lucía', 'Pedro', 'María', 'Javi', 'Elena', 'Diego']
const rand = arr => arr[Math.floor(Math.random() * arr.length)]
const genId = () => Math.random().toString(36).substring(2, 10).toUpperCase()

// Create bot users
async function createBots(n) {
  const bots = []
  for (let i = 0; i < n; i++) {
    const email = `bot${i+1}_${Date.now()}@test.queda.xyz`
    const pass = 'TestBot123!'
    const { data, error } = await db.auth.signUp({ email, password: pass })
    if (error) { console.log(`  ✗ Bot ${i+1}: ${error.message}`); continue }
    const name = NAMES[i % NAMES.length]
    await db.from('profiles').upsert({ id: data.user.id, name, email, lang: 'es' })
    bots.push({ id: data.user.id, name, email, pass })
    console.log(`  ✓ ${name} (${email})`)
  }
  return bots
}

// Create a plan
async function createPlan(bot, planData) {
  const { data: { session } } = await db.auth.signInWithPassword({ email: bot.email, password: bot.pass })
  const plan = {
    id: genId(),
    name: planData.name,
    desc: planData.desc || null,
    organizer: bot.name,
    dates: planData.dates,
    startTimes: planData.startTimes || [],
    stops: planData.stops || [],
    city: planData.city || '',
    confirmedDate: null,
    isPublic: false,
    lang: 'es',
    createdAt: new Date().toISOString()
  }
  await db.from('plans').upsert({ id: plan.id, data: plan, user_id: bot.id })
  await admin.from('user_plans').upsert({ user_id: bot.id, plan_id: plan.id, role: 'organizer' })
  console.log(`  ✓ Plan "${plan.name}" → ${plan.id}`)
  return plan
}

// Respond to a plan
async function respond(bot, plan) {
  const avail = {}
  const slots = []
  for (const d of plan.dates) {
    if (plan.startTimes?.length > 0) {
      for (const st of plan.startTimes.filter(Boolean)) {
        slots.push(`${d}_${st}`)
      }
    } else {
      slots.push(d)
    }
  }

  // Bot personality: enthusiastic, busy, or flaky
  const personality = rand(['enthusiastic', 'enthusiastic', 'busy', 'busy', 'partial', 'flaky'])

  let hasYes = false
  if (personality === 'enthusiastic') {
    // Says yes to most things
    for (const key of slots) {
      if (Math.random() < 0.8) { avail[key] = 'yes'; hasYes = true }
      // else: blank (not no — enthusiastic people don't say no)
    }
  } else if (personality === 'busy') {
    // Can only make 1-2 slots
    const yesCount = Math.ceil(Math.random() * 2)
    const shuffled = [...slots].sort(() => Math.random() - 0.5)
    shuffled.forEach((key, i) => {
      if (i < yesCount) { avail[key] = 'yes'; hasYes = true }
      else avail[key] = 'no'
    })
  } else if (personality === 'partial') {
    // Yes to about half
    for (const key of slots) {
      if (Math.random() < 0.5) { avail[key] = 'yes'; hasYes = true }
      else avail[key] = 'no'
    }
  } else {
    // Flaky: says no to everything
    for (const key of slots) avail[key] = 'no'
  }
  if (!hasYes && slots.length > 0 && personality !== 'flaky') avail[slots[0]] = 'yes'

  // Stop attendance coherent with date votes
  const stopAttend = {}
  const dateHasYes = Object.values(avail).some(v => v === 'yes')
  for (const s of (plan.stops || [])) {
    if (!dateHasYes) { stopAttend[s.id] = 'no'; continue }
    if (personality === 'enthusiastic') stopAttend[s.id] = 'yes'
    else if (personality === 'flaky') stopAttend[s.id] = 'no'
    else stopAttend[s.id] = Math.random() < 0.75 ? 'yes' : 'no'
  }

  // Comments coherent with personality
  const commentsMap = {
    enthusiastic: ['¡Vamos! 🎉', 'Me encanta el plan', 'Yo llevo postre', 'Perfecto para mí', '¡Qué ganas!', ''],
    busy: ['Solo puedo a esa hora', 'Llego un poco tarde pero voy', 'Salgo del trabajo y voy directo', 'Intentaré llegar a tiempo', ''],
    partial: ['¿Alguien lleva coche?', 'A lo mejor me uno más tarde', 'Depende de cómo vaya el día', ''],
    flaky: ['No puedo esa semana 😕', 'Lo siento, me pilla mal', 'Pasadlo bien sin mí', 'A ver si la próxima']
  }

  const resp = {
    name: bot.name,
    avail,
    stopAttend: Object.keys(stopAttend).length > 0 ? stopAttend : null,
    comment: rand(commentsMap[personality]),
    how: personality === 'flaky' ? '' : rand(['car', 'transit', 'walk', 'bike']),
    at: new Date().toISOString()
  }

  await db.from('responses').insert({ plan_id: plan.id, name: bot.name, data: resp })
  await admin.from('user_plans').upsert({ user_id: bot.id, plan_id: plan.id, role: 'invited' })

  const yesCount = Object.values(avail).filter(v => v === 'yes').length
  const noCount = Object.values(avail).filter(v => v === 'no').length
  console.log(`  ✓ ${bot.name}: ${yesCount} sí, ${noCount} no`)
}

// ─── MAIN ───────────────────────────────────────────
async function main() {
  console.log('\n🤖 Creating bots...')
  const bots = await createBots(8)
  if (bots.length < 2) { console.log('Not enough bots created'); return }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const day2 = new Date(); day2.setDate(day2.getDate() + 3)
  const day3 = new Date(); day3.setDate(day3.getDate() + 5)
  const fmt = d => d.toISOString().split('T')[0]

  console.log('\n📋 Creating plans...')

  // Plan 1: Dinner with 3 dates, 2 times, 2 stops
  const plan1 = await createPlan(bots[0], {
    name: 'Cena de cumpleaños',
    desc: '¡Celebramos el cumple de Ana! Cena + copas después.',
    dates: [fmt(tomorrow), fmt(day2), fmt(day3)],
    startTimes: ['19:00', '20:30'],
    city: 'Madrid',
    stops: [
      { id: 's1', options: [{ id: 'o1', name: 'La Barraca', address: 'Calle Reina 29, Madrid', lat: 40.4203, lng: -3.6988, rating: 4.5 }], duration: '2h', minAttendees: '3', meetingPoint: 'Metro Sol', meetingMinsBefore: '15' },
      { id: 's2', options: [{ id: 'o2', name: 'Café Central', address: 'Plaza del Ángel 10, Madrid', lat: 40.4147, lng: -3.7005, rating: 4.7 }], duration: '2h', minAttendees: '2' }
    ]
  })

  // Plan 2: Simple beach day, 1 date, 1 stop
  const plan2 = await createPlan(bots[2], {
    name: 'Playa Malvarrosa',
    desc: 'Día de playa. Traed sombrilla y nevera.',
    dates: [fmt(day2)],
    startTimes: ['10:00'],
    city: 'Valencia',
    stops: [
      { id: 's3', options: [{ id: 'o3', name: 'Playa de la Malvarrosa', address: 'Paseo Marítimo, Valencia', lat: 39.4786, lng: -0.3244 }], duration: '4h+' }
    ]
  })

  // Plan 3: Work meeting, 2 dates, 3 times
  const plan3 = await createPlan(bots[4], {
    name: 'Quarterly Review Q2',
    desc: 'Review Q2 results. Please confirm ASAP.',
    dates: [fmt(tomorrow), fmt(day2)],
    startTimes: ['09:00', '11:00', '14:00'],
    city: 'Barcelona',
    stops: [
      { id: 's4', options: [{ id: 'o4', name: 'WeWork Glòries', address: 'Avinguda Diagonal 211, Barcelona', lat: 41.4036, lng: 2.1879 }], duration: '1h30' }
    ]
  })

  console.log('\n🗳️ Voting on Plan 1 (Cena de cumpleaños)...')
  for (const bot of bots.slice(1)) await respond(bot, plan1)

  console.log('\n🗳️ Voting on Plan 2 (Playa)...')
  for (const bot of [bots[0], bots[1], bots[3], bots[5]]) await respond(bot, plan2)

  console.log('\n🗳️ Voting on Plan 3 (Quarterly Review)...')
  for (const bot of bots.slice(0, 6)) await respond(bot, plan3)

  console.log('\n✅ Done! Plans:')
  console.log(`   ${plan1.id} — ${plan1.name} (${bots.slice(1).length} responses)`)
  console.log(`   ${plan2.id} — ${plan2.name} (4 responses)`)
  console.log(`   ${plan3.id} — ${plan3.name} (6 responses)`)
  console.log('\n   Open the app and enter these codes to see results.\n')
}

main().catch(console.error)
