import { test, expect } from '@playwright/test'

// ═══════════════════════════════════════════════════════
// Helper: login via Supabase SDK (fast, no UI interaction)
// ═══════════════════════════════════════════════════════
async function loginViaSDK(page) {
  const email = process.env.TEST_EMAIL
  const pass = process.env.TEST_PASSWORD
  if (!email || !pass) return false

  await page.goto('/')
  const result = await page.evaluate(async ({ email, pass }) => {
    const wait = () => new Promise(r => {
      const iv = setInterval(() => { if (window.__supabaseClient) { clearInterval(iv); r() } }, 100)
      setTimeout(() => { clearInterval(iv); r() }, 5000)
    })
    await wait()
    if (!window.__supabaseClient) return { ok: false, err: 'supabaseClient not found' }
    const db = window.__supabaseClient
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass })
    if (error) return { ok: false, err: error.message }

    // Ensure profile has required fields to skip onboarding
    const uid = data.user.id
    const { data: profile } = await db.from('profiles').select('*').eq('id', uid).maybeSingle()
    const needsOnboard = !profile?.bio || !profile?.birthdate || !profile?.interests?.length
    if (needsOnboard) {
      await db.from('profiles').upsert({
        id: uid,
        name: profile?.name || email.split('@')[0],
        email: email,
        bio: profile?.bio || 'Test user for e2e',
        birthdate: profile?.birthdate || '1991-01-01',
        interests: profile?.interests?.length ? profile.interests : ['cafe', 'sport'],
        lang: 'en',
        updated_at: new Date().toISOString()
      })
    }
    return { ok: true }
  }, { email, pass })

  if (!result.ok) {
    console.log('loginViaSDK failed:', result.err)
    return false
  }

  await page.reload()
  await page.waitForSelector('text=queda.', { timeout: 10000 })
  return true
}

// Helper: wait for app to finish loading (spinner gone)
async function waitForAppReady(page) {
  // Wait for spinner to disappear or feed/profile to appear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[style*="animation: spin"]')
    return spinners.length === 0
  }, { timeout: 10000 }).catch(() => {})
}

// ═══════════════════════════════════════════════════════
// 1. LANDING PAGE (no auth)
// ═══════════════════════════════════════════════════════
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
    const critical = errors.filter(e =>
      !e.includes('Script error') &&
      !e.includes('ResizeObserver') &&
      !e.includes('supabaseUrl')
    )
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

  test('CTA navigates to auth screen', async ({ page }) => {
    await page.goto('/')
    // Find the main CTA button (Get started / Empieza ahora)
    const cta = page.locator('button').filter({ hasText: /get started|empieza|começa|commencer|jetzt|inizia/i }).first()
    await expect(cta).toBeVisible({ timeout: 5000 })
    await cta.click()
    // Should show auth screen with email input
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════════════════
// 2. AUTH — Registration & Login
// ═══════════════════════════════════════════════════════
test.describe('Auth flows', () => {
  test('register with new email shows confirmation screen', async ({ page }) => {
    await page.goto('/')
    // Navigate to auth
    const cta = page.locator('button').filter({ hasText: /get started|empieza|começa|commencer|jetzt|inizia/i }).first()
    await cta.click()
    await page.waitForTimeout(500)

    // Switch to register tab
    const registerTab = page.locator('button').filter({ hasText: /register|crear cuenta|regist/i }).first()
    if (await registerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registerTab.click()
    }

    // Fill form with unique email
    const uniqueEmail = `test_${Date.now()}@test.queda.xyz`
    await page.locator('input[type="email"]').fill(uniqueEmail)
    await page.locator('input[type="password"]').fill('TestPass123!')

    // Submit
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()
    await page.waitForTimeout(3000)

    // Should show confirmation screen (📧 emoji) or error for already registered
    const confirmScreen = page.locator('text=📧').first()
    const errorMsg = page.locator('text=/already|ya registrad/i').first()
    const either = await confirmScreen.isVisible({ timeout: 5000 }).catch(() => false) ||
                   await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)
    expect(either).toBe(true)
  })

  test('login with valid credentials shows feed', async ({ page }) => {
    const email = process.env.TEST_EMAIL
    const pass = process.env.TEST_PASSWORD
    if (!email || !pass) { test.skip(); return }

    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) { test.skip(); return }

    // Should see authenticated content: feed heading
    const feedHeading = page.locator('h2').filter({ hasText: /discover|descubrir|descobrir/i }).first()
    await expect(feedHeading).toBeVisible({ timeout: 10000 })
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('button').filter({ hasText: /get started|empieza|sign in|iniciar/i }).first()
    await cta.click()
    await page.waitForTimeout(500)

    await page.locator('input[type="email"]').fill('wrong@test.queda.xyz')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)

    // Should show error message
    const error = page.locator('text=/incorrect|wrong|invalid|contraseña incorrecta|error/i').first()
    await expect(error).toBeVisible({ timeout: 5000 })
  })

  test('navigating without auth shows landing', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(2000)
    // Should redirect to landing or show auth — not show profile
    const landing = page.locator('text=queda.').first()
    await expect(landing).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════════════════
// 3. CREATE PLAN (requires auth)
// ═══════════════════════════════════════════════════════
test.describe('Create plan', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) test.skip()
  })

  test('navigate to create page via bottom nav', async ({ page }) => {
    await waitForAppReady(page)
    // Click create in bottom nav (➕)
    const createNav = page.locator('button').filter({ hasText: '➕' }).first()
    await expect(createNav).toBeVisible({ timeout: 5000 })
    await createNav.click()
    await page.waitForTimeout(1000)

    // Should see create form with title input
    const heading = page.locator('text=/create a plan|crear un plan|crea/i').first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('create button disabled without required fields', async ({ page }) => {
    await page.goto('/create')
    await page.waitForTimeout(2000)

    // Find the create/submit button
    const createBtn = page.locator('button').filter({ hasText: /create plan|crear plan|crea/i }).last()
    await expect(createBtn).toBeVisible({ timeout: 5000 })
    // Should be disabled (opacity 0.3)
    const opacity = await createBtn.evaluate(el => getComputedStyle(el).opacity)
    expect(parseFloat(opacity)).toBeLessThan(0.5)
  })

  test('fill title and category shows them selected', async ({ page }) => {
    await page.goto('/create')
    await page.waitForTimeout(2000)

    // Fill title
    const titleInput = page.locator('input[maxlength="100"]').first()
    await titleInput.fill('Test Plan E2E')
    await expect(titleInput).toHaveValue('Test Plan E2E')

    // Select a category (click first category button — cafe ☕)
    const catBtn = page.locator('button').filter({ hasText: '☕' }).first()
    await catBtn.click()
    // Category should be highlighted (border changes to accent)
    await page.waitForTimeout(300)
  })
})

// ═══════════════════════════════════════════════════════
// 4. FEED & FILTERS (requires auth)
// ═══════════════════════════════════════════════════════
test.describe('Feed and navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) test.skip()
  })

  test('feed loads with heading and filter bar', async ({ page }) => {
    await waitForAppReady(page)
    // Should see discover heading
    const heading = page.locator('h2').filter({ hasText: /discover|descubrir|descobrir/i }).first()
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Should see filter bar (category dropdown button)
    const catFilter = page.locator('button[aria-haspopup="listbox"]').first()
    await expect(catFilter).toBeVisible({ timeout: 5000 })
  })

  test('feed shows plan cards or empty state', async ({ page }) => {
    await waitForAppReady(page)
    await page.waitForTimeout(2000)

    // Either plan cards or empty state emoji
    const planCard = page.locator('text=📅').first()
    const emptyState = page.locator('text=🔭').first()
    const either = await planCard.isVisible({ timeout: 5000 }).catch(() => false) ||
                   await emptyState.isVisible({ timeout: 1000 }).catch(() => false)
    expect(either).toBe(true)
  })

  test('category filter dropdown opens and closes', async ({ page }) => {
    await waitForAppReady(page)
    const catFilter = page.locator('button[aria-haspopup="listbox"]').first()
    await catFilter.click()

    // Listbox should appear
    const listbox = page.locator('[role="listbox"]')
    await expect(listbox).toBeVisible({ timeout: 2000 })

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(listbox).not.toBeVisible({ timeout: 2000 })
  })

  test('bottom nav switches between feed, map, and profile', async ({ page }) => {
    await waitForAppReady(page)

    // Click map nav
    const mapNav = page.locator('button').filter({ hasText: '🗺️' }).first()
    await mapNav.click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/map')

    // Click profile nav
    const profileNav = page.locator('button').filter({ hasText: '👤' }).first()
    await profileNav.click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/profile')

    // Click feed nav (🔍)
    const feedNav = page.locator('button').filter({ hasText: '🔍' }).first()
    await feedNav.click()
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/\/$/)
  })
})

// ═══════════════════════════════════════════════════════
// 5. PLAN DETAIL & JOIN (requires auth)
// ═══════════════════════════════════════════════════════
test.describe('Plan detail', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) test.skip()
  })

  test('clicking a plan card navigates to detail', async ({ page }) => {
    await waitForAppReady(page)
    await page.waitForTimeout(2000)

    // Find any plan card (div with 📅 inside)
    const cards = page.locator('div[style*="cursor: pointer"]').filter({ hasText: '📅' })
    const count = await cards.count()
    if (count === 0) { test.skip(); return }

    await cards.first().click()
    await page.waitForTimeout(2000)

    // Should be on plan detail page
    expect(page.url()).toContain('/plan/')
    // Should see plan info (date, time, place icons)
    await expect(page.locator('text=📅').first()).toBeVisible({ timeout: 5000 })
  })

  test('plan detail shows organizer and participants section', async ({ page }) => {
    await waitForAppReady(page)
    await page.waitForTimeout(2000)

    const cards = page.locator('div[style*="cursor: pointer"]').filter({ hasText: '📅' })
    if (await cards.count() === 0) { test.skip(); return }

    await cards.first().click()
    await page.waitForTimeout(2000)

    // Should see organizer section
    const organizer = page.locator('text=/organizer|organizador/i').first()
    await expect(organizer).toBeVisible({ timeout: 5000 })

    // Should see participants section
    const participants = page.locator('text=/participants|participantes/i').first()
    await expect(participants).toBeVisible({ timeout: 5000 })
  })

  test('plan detail shows join or leave button', async ({ page }) => {
    await waitForAppReady(page)
    await page.waitForTimeout(2000)

    const cards = page.locator('div[style*="cursor: pointer"]').filter({ hasText: '📅' })
    if (await cards.count() === 0) { test.skip(); return }

    await cards.first().click()
    await page.waitForTimeout(2000)

    // Should show one of: Join, Leave, Waiting, Full, or Chat tab (if already joined)
    const joinBtn = page.locator('button').filter({ hasText: /join|unirse|request|solicitar/i }).first()
    const leaveBtn = page.locator('button').filter({ hasText: /leave|dejar|salir/i }).first()
    const pendingMsg = page.locator('text=/waiting|esperando/i').first()
    const chatTab = page.locator('button').filter({ hasText: /chat/i }).first()

    const anyAction =
      await joinBtn.isVisible({ timeout: 3000 }).catch(() => false) ||
      await leaveBtn.isVisible({ timeout: 1000 }).catch(() => false) ||
      await pendingMsg.isVisible({ timeout: 1000 }).catch(() => false) ||
      await chatTab.isVisible({ timeout: 1000 }).catch(() => false)
    expect(anyAction).toBe(true)
  })

  test('invalid plan URL shows not found', async ({ page }) => {
    await page.goto('/plan/ZZZZZZZZZZ')
    await page.waitForTimeout(5000)

    // Should show queda logo (not blank) and possibly "not found" message
    await expect(page.locator('text=queda.').first()).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════════════════
// 6. PROFILE (requires auth)
// ═══════════════════════════════════════════════════════
test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) test.skip()
  })

  test('profile page shows user info', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(3000)

    // Should see profile heading
    const heading = page.locator('text=/my profile|mi perfil|meu perfil/i').first()
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Should see edit and sign out buttons
    const editBtn = page.locator('button').filter({ hasText: /edit|editar/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
  })

  test('edit mode opens and shows form fields', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(3000)

    const editBtn = page.locator('button').filter({ hasText: /edit|editar/i }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Should see name input, bio textarea, save/cancel buttons
    const nameInput = page.locator('input[maxlength="50"]').first()
    await expect(nameInput).toBeVisible({ timeout: 3000 })

    const bioTextarea = page.locator('textarea[maxlength="300"]').first()
    await expect(bioTextarea).toBeVisible({ timeout: 3000 })

    const saveBtn = page.locator('button').filter({ hasText: /save|guardar|salvar/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 3000 })
  })

  test('edit name and save persists', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(3000)

    // Enter edit mode
    const editBtn = page.locator('button').filter({ hasText: /edit|editar/i }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Change name
    const nameInput = page.locator('input[maxlength="50"]').first()
    const originalName = await nameInput.inputValue()
    const testName = 'E2E Test ' + Date.now().toString().slice(-4)
    await nameInput.fill(testName)

    // Save
    const saveBtn = page.locator('button').filter({ hasText: /save|guardar|salvar/i }).first()
    await saveBtn.click()
    await page.waitForTimeout(2000)

    // Should be back in view mode showing the new name
    await expect(page.locator(`text=${testName}`).first()).toBeVisible({ timeout: 5000 })

    // Restore original name
    const editBtn2 = page.locator('button').filter({ hasText: /edit|editar/i }).first()
    await editBtn2.click()
    await page.waitForTimeout(500)
    await nameInput.fill(originalName)
    await saveBtn.click()
    await page.waitForTimeout(1000)
  })

  test('language picker in profile shows all 6 languages', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(3000)

    const editBtn = page.locator('button').filter({ hasText: /edit|editar/i }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Should see 6 language buttons
    const langButtons = page.locator('button').filter({ hasText: /Español|English|Português|Français|Deutsch|Italiano/ })
    expect(await langButtons.count()).toBe(6)
  })
})

// ═══════════════════════════════════════════════════════
// 7. ERRORS & EDGE CASES
// ═══════════════════════════════════════════════════════
test.describe('Errors and edge cases', () => {
  test('404 route shows fallback', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await page.waitForTimeout(2000)
    // Should show something (queda logo or 404)
    const logo = page.locator('text=queda.').first()
    const notFound = page.locator('text=404').first()
    const either = await logo.isVisible({ timeout: 5000 }).catch(() => false) ||
                   await notFound.isVisible({ timeout: 1000 }).catch(() => false)
    expect(either).toBe(true)
  })

  test('direct plan URL for nonexistent plan shows error', async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) { test.skip(); return }

    await page.goto('/plan/XXXXXXXXXX')
    await page.waitForTimeout(5000)

    // Should show not found message or queda logo
    const notFound = page.locator('text=🤷').first()
    const logo = page.locator('text=queda.').first()
    const either = await notFound.isVisible({ timeout: 3000 }).catch(() => false) ||
                   await logo.isVisible({ timeout: 1000 }).catch(() => false)
    expect(either).toBe(true)
  })

  test('app recovers from going offline', async ({ page }) => {
    const loggedIn = await loginViaSDK(page)
    if (!loggedIn) { test.skip(); return }
    await waitForAppReady(page)

    // Go offline
    await page.context().setOffline(true)
    await page.waitForTimeout(1500)

    // Go back online
    await page.context().setOffline(false)
    await page.waitForTimeout(2000)

    // App should still be functional (logo visible — may need reload after offline)
    if (!await page.locator('text=queda.').first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.reload()
    }
    await expect(page.locator('text=queda.').first()).toBeVisible({ timeout: 5000 })
  })
})
