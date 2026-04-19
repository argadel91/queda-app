/**
 * Supabase network mock helper for Playwright tests.
 *
 * Uses page.route() with ** wildcard patterns so the mocks work regardless of
 * which Supabase project URL is set in VITE_SUPABASE_URL at dev-server startup.
 *
 * Call mockSupabase(page, options) before navigating.  The function installs
 * route handlers for every Supabase endpoint the app touches.
 */

export const MOCK_USER = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  email: 'testuser@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
}

export const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: MOCK_USER,
}

export const MOCK_PROFILE = {
  id: MOCK_USER.id,
  username: 'testuser',
  gender: 'male',
  birthdate: '1991-01-01',
  bio: 'I love testing',
  token_balance: 6,
  city: 'Madrid',
  created_at: '2024-01-01T00:00:00Z',
}

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

export const MOCK_PLANS = [
  {
    id: 'plan-001',
    user_id: 'bbbbbbbb-0000-0000-0000-000000000002',
    title: 'Sunday football in the park',
    description: 'Casual 5-a-side, all welcome',
    category: 'sports',
    place_name: 'Retiro Park',
    place_address: 'Paseo del Retiro, Madrid',
    lat: 40.4153,
    lng: -3.6844,
    date: tomorrow,
    time: '17:00:00',
    capacity: 10,
    join_mode: 'open',
    gender_filter: 'mixed',
    status: 'active',
    min_attendees: 2,
    min_trust: 0,
    cancellation_deadline_hours: 24,
    checked_out_at: null,
    auto_checked_out: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan-002',
    user_id: 'cccccccc-0000-0000-0000-000000000003',
    title: 'Coffee and board games',
    description: null,
    category: 'social',
    place_name: 'Café Central',
    place_address: 'Plaza del Ángel, Madrid',
    lat: 40.4148,
    lng: -3.7028,
    date: tomorrow,
    time: '18:30:00',
    capacity: 6,
    join_mode: 'open',
    gender_filter: 'mixed',
    status: 'active',
    min_attendees: 2,
    min_trust: 0,
    cancellation_deadline_hours: 24,
    checked_out_at: null,
    auto_checked_out: false,
    created_at: new Date().toISOString(),
  },
]

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    user_id: MOCK_USER.id,
    type: 'join',
    title: 'Someone joined your plan',
    body: 'Sunday football in the park',
    plan_id: 'plan-001',
    read: false,
    created_at: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'notif-002',
    user_id: MOCK_USER.id,
    type: 'reminder',
    title: 'Your plan is tomorrow',
    body: 'Sunday football in the park',
    plan_id: 'plan-001',
    read: true,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
]

/**
 * Install Supabase mock routes on a Playwright page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {boolean} [opts.loggedIn=false]  Whether to simulate an authenticated session.
 * @param {object[]} [opts.plans]          Plans to return from the plans table.
 * @param {object[]} [opts.notifications]  Notifications to return.
 */
export async function mockSupabase(page, { loggedIn = false, plans = MOCK_PLANS, notifications = [] } = {}) {
  // --- Auth: session check ---
  await page.route('**/auth/v1/session', route => {
    if (loggedIn) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: MOCK_SESSION.access_token, user: MOCK_USER }),
      })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: null, user: null }) })
    }
  })

  // --- Auth: sign in with password ---
  await page.route('**/auth/v1/token*', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) })
  })

  // --- Auth: sign up ---
  await page.route('**/auth/v1/signup', route => {
    // Simulate "confirm email" flow (no immediate session)
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER, session: null }) })
  })

  // --- Auth: sign out ---
  await page.route('**/auth/v1/logout*', route => {
    route.fulfill({ status: 204, body: '' })
  })

  // --- REST: profiles ---
  await page.route('**/rest/v1/profiles*', route => {
    const method = route.request().method()
    if (method === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loggedIn ? [MOCK_PROFILE] : []) })
    } else {
      // PATCH/POST (profile update)
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PROFILE]) })
    }
  })

  // --- REST: plans ---
  await page.route('**/rest/v1/plans*', route => {
    const method = route.request().method()
    if (method === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plans) })
    } else if (method === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })

  // --- REST: plan_participants ---
  await page.route('**/rest/v1/plan_participants*', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  // --- REST: notifications ---
  await page.route('**/rest/v1/notifications*', route => {
    const method = route.request().method()
    if (method === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(notifications) })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })

  // --- REST: tokens_ledger ---
  await page.route('**/rest/v1/tokens_ledger*', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  // --- RPC calls (trust_score, activity_score, social_score, join_plan_free, etc.) ---
  await page.route('**/rest/v1/rpc/**', route => {
    const url = route.request().url()
    if (url.includes('trust_score') || url.includes('activity_score') || url.includes('social_score')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(-1) })
    } else if (url.includes('join_plan_free')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ participant_id: 'pid-001', new_status: 'joined' }]),
      })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) })
    }
  })

  // --- Supabase Realtime (WebSocket upgrades — let them fail silently) ---
  // Playwright does not intercept WebSockets by default. The components handle
  // realtime failures gracefully, so no explicit mock is needed.
}

/**
 * Set up auth session storage so useAuth() sees a valid session on load.
 * Call this via page.addInitScript() for pages that check localStorage.
 */
export function getAuthStorageScript(supabaseUrl) {
  const storageKey = `sb-${new URL(supabaseUrl || 'https://test.supabase.co').hostname.split('.')[0]}-auth-token`
  return `
    window.localStorage.setItem(${JSON.stringify(storageKey)}, JSON.stringify({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_at: ${Math.floor(Date.now() / 1000) + 3600},
      token_type: "bearer",
      user: ${JSON.stringify(MOCK_USER)}
    }));
  `
}
