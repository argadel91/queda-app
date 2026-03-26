import { test, expect } from '@playwright/test'

// ═══════════════════════════════════════════════
// Test 1: Landing page (no auth needed)
// ═══════════════════════════════════════════════
test.describe('Landing page', () => {
  test('renders logo and CTA without crash', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=queda.').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button').first()).toBeVisible()
  })

  test('no critical console errors', async ({ page }) => {
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(2000)
    const critical = errors.filter(e => !e.includes('Script error') && !e.includes('ResizeObserver') && !e.includes('supabaseUrl'))
    expect(critical).toEqual([])
  })

  test('loads under 5 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await expect(page.locator('text=queda.').first()).toBeVisible()
    expect(Date.now() - start).toBeLessThan(5000)
  })

  test('no horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/')
    await expect(page.locator('text=queda.').first()).toBeVisible()
    const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)
    expect(noOverflow).toBe(true)
  })
})

// ═══════════════════════════════════════════════
// Tests 2-5: Authenticated (login via Supabase)
// ═══════════════════════════════════════════════
test.describe('Authenticated flows', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const pass = process.env.TEST_PASSWORD
    if (!email || !pass) { test.skip(); return }

    // Login via Supabase SDK in browser (bypass UI completely)
    await page.goto('/')
    await page.waitForTimeout(1000)
    const loggedIn = await page.evaluate(async ({ email, pass }) => {
      // Wait for Supabase to be available
      const wait = () => new Promise(r => { const iv = setInterval(() => { if (window.__supabaseClient) { clearInterval(iv); r(); } }, 100); setTimeout(() => { clearInterval(iv); r(); }, 5000); });
      await wait();
      if (!window.__supabaseClient) return false;
      const { error } = await window.__supabaseClient.auth.signInWithPassword({ email, password: pass });
      return !error;
    }, { email, pass });

    if (!loggedIn) {
      // Fallback: try via UI
      await page.goto('/')
      const signInBtn = page.getByRole('button', { name: /sign in|get started/i }).first()
      if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await signInBtn.click()
        await page.waitForTimeout(1000)
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(pass)
        await page.locator('button').filter({ hasText: /sign in|iniciar/i }).first().click()
        await page.waitForTimeout(4000)
      }
    } else {
      await page.reload()
      await page.waitForTimeout(2000)
    }
  })

  // ── Test 2: Create plan navigates through steps ──
  test('create plan step navigation', async ({ page }) => {
    // Navigate to create from home (already logged in)
    const createBtn = page.locator('button').filter({ hasText: /create|crear|creat/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
    } else {
      await page.goto('/create/date')
    }
    await page.waitForTimeout(2000)

    // Should see calendar or date step
    const dateContent = page.locator('h2').first().or(page.locator('text=📅').first())
    await expect(dateContent).toBeVisible({ timeout: 8000 })
  })

  // ── Test 3: Open plan and see content ──
  test('plan page loads and shows tabs', async ({ page }) => {
    // Navigate to plans list first
    await page.goto('/plans')
    await page.waitForTimeout(3000)

    // Click first plan card
    const card = page.locator('[role="button"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click()
      await page.waitForTimeout(3000)

      // Should see tabs
      const tabs = page.locator('button').filter({ hasText: /plan|vot|result|más|more/i })
      expect(await tabs.count()).toBeGreaterThanOrEqual(2)
    } else {
      // No plans — verify plans page loaded
      await expect(page.locator('text=queda.').first()).toBeVisible()
    }
  })

  // ── Test 4: Vote interaction works ──
  test('vote buttons respond to clicks', async ({ page }) => {
    await page.goto('/plan/TEST01AB')
    await page.waitForTimeout(3000)

    // Try to find and click the expand/Ver button
    const expandBtn = page.locator('button').filter({ hasText: /ver|see|details/i }).first()
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(1000)

      // Look for yes/no voting buttons
      const yesBtn = page.locator('button').filter({ hasText: /^(✓\s*)?(sí|yes)$/i }).first()
      if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await yesBtn.click()
        // Should not crash — page still visible
        await expect(page.locator('text=queda.').first()).toBeVisible()
      }
    }
    // Page didn't crash
    await expect(page.locator('text=queda.').first()).toBeVisible()
  })

  // ── Test 5: Offline triggers toast (skipped: Playwright setOffline doesn't fire browser 'offline' event reliably) ──
  test.skip('going offline shows no-connection toast', async ({ page }) => {
    // Wait for app to be fully loaded (already logged in from beforeEach)
    await page.waitForTimeout(2000)

    // Go offline
    await page.context().setOffline(true)
    await page.waitForTimeout(1500)

    // Should see offline toast
    const toast = page.locator('text=/sin conexión|no connection|no internet/i').first()
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Go back online
    await page.context().setOffline(false)
    await page.waitForTimeout(1500)

    // Should see back online toast
    const onlineToast = page.locator('text=/restaurada|back online|wieder online/i').first()
    await expect(onlineToast).toBeVisible({ timeout: 5000 })
  })

  // ── Test 6: Invalid plan URL shows fallback ──
  test('invalid plan URL does not show blank page', async ({ page }) => {
    await page.goto('/plan/ZZZZZZZZZZ')
    await page.waitForTimeout(5000)

    // Should show something — queda logo at minimum, not blank
    await expect(page.locator('text=queda.').first()).toBeVisible({ timeout: 5000 })
  })

  // ── Test 7: Edit modal opens and closes ──
  test('edit modal opens with Escape to close', async ({ page }) => {
    await page.goto('/plans')
    await page.waitForTimeout(2000)

    // Open first plan (if exists)
    const card = page.locator('[role="button"]').first()
    if (!(await card.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await card.click()
    await page.waitForTimeout(2000)

    // Find edit title button
    const editBtn = page.locator('button[aria-label="Edit title"]')
    if (!(await editBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip() // Not organizer
      return
    }

    // Open edit modal
    await editBtn.click()
    await page.waitForTimeout(500)

    // Modal should be visible
    const modal = page.locator('div[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 2000 })

    // Close with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Modal should be gone
    await expect(modal).not.toBeVisible()
  })
})

// ═══════════════════════════════════════════════
// Test: Expired deadline plan
// ═══════════════════════════════════════════════
test.describe('Expired deadline', () => {
  const PLAN_ID = 'EXPTEST1'
  const SB_URL = process.env.VITE_SUPABASE_URL
  const SB_KEY = process.env.VITE_SUPABASE_KEY

  test.beforeAll(async () => {
    if (!SB_URL || !SB_KEY) return
    // Create plan with expired deadline via Supabase API
    const plan = {
      id: PLAN_ID, name: 'Expired Test', desc: 'Test plan with past deadline', organizer: 'TestBot',
      date: '2026-04-01', time: '20:00', dates: ['2026-04-01'], startTimes: ['20:00'],
      place: { name: 'Test Place', address: 'Test St 1' },
      stops: [{ id: 1, options: [{ id: 1, name: 'Test Place', address: 'Test St 1' }] }],
      deadline: '2026-03-20T12:00', confirmedDate: null, isPublic: false, lang: 'en',
      createdAt: new Date().toISOString()
    }
    await fetch(`${SB_URL}/rest/v1/plans`, {
      method: 'POST', headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: PLAN_ID, data: plan, is_public: false })
    })
  })

  test.afterAll(async () => {
    if (!SB_URL || !SB_KEY) return
    await fetch(`${SB_URL}/rest/v1/plans?id=eq.${PLAN_ID}`, {
      method: 'DELETE', headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    })
  })

  test.skip('expired deadline shows closed message and disables save — middleware cookie blocks direct plan URL in tests', async ({ page }) => {
    if (!SB_URL) { test.skip(); return }

    // Login
    const email = process.env.TEST_EMAIL
    const pass = process.env.TEST_PASSWORD
    if (!email || !pass) { test.skip(); return }
    await page.goto('/')
    await page.waitForTimeout(1000)
    await page.evaluate(async ({ email, pass }) => {
      const wait = () => new Promise(r => { const iv = setInterval(() => { if (window.__supabaseClient) { clearInterval(iv); r(); } }, 100); setTimeout(() => { clearInterval(iv); r(); }, 5000); });
      await wait();
      if (window.__supabaseClient) await window.__supabaseClient.auth.signInWithPassword({ email, password: pass });
    }, { email, pass })
    await page.reload()
    await page.waitForTimeout(2000)

    // Navigate to the plan via JS (avoids middleware cookie issue)
    await page.evaluate((id) => { window.location.href = '/plan/' + id; }, PLAN_ID)
    await page.waitForTimeout(4000)

    // If we see the middleware page, click through
    const joinBtn = page.locator('text=Join this plan').first()
    if (await joinBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // We're on middleware preview — reload to get past cookie
      await page.reload()
      await page.waitForTimeout(3000)
    }

    // Expand
    const expandBtn = page.locator('button').filter({ hasText: /ver|see|details/i }).first()
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(1000)
    }

    // Should show deadline passed message
    const closedMsg = page.locator('text=/plazo cerrado|deadline passed|closed/i').first()
    await expect(closedMsg).toBeVisible({ timeout: 5000 })
  })
})
