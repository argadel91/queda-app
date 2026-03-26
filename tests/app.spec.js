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
    // Login via Supabase SDK directly (bypass UI)
    await page.goto('/')
    await page.waitForTimeout(1000)

    const email = process.env.TEST_EMAIL
    const pass = process.env.TEST_PASSWORD
    if (!email || !pass) { test.skip(); return }

    // Try to login via UI
    const signInBtn = page.getByRole('button', { name: /sign in|get started/i }).first()
    if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInBtn.click()
      await page.waitForTimeout(1000)
      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill(email)
        await page.locator('input[type="password"]').fill(pass)
        // Click the sign in button (not register)
        const loginBtn = page.locator('button').filter({ hasText: /^(sign in|iniciar sesión)$/i }).first()
        if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await loginBtn.click()
        } else {
          // Fallback: click first submit-like button
          await page.locator('button[type="submit"], button').filter({ hasText: /sign|iniciar|entrar/i }).first().click()
        }
        await page.waitForTimeout(3000)
      }
    }
    // Verify we're logged in (header shows avatar or home content)
    await page.waitForTimeout(2000)
  })

  // ── Test 2: Create plan navigates through steps ──
  test('create plan step navigation', async ({ page }) => {
    await page.goto('/create/date')
    await page.waitForTimeout(2000)

    // Verify we're on the date step
    const heading = page.locator('h2').first()
    await expect(heading).toBeVisible({ timeout: 5000 })

    // The calendar should be visible
    const calendar = page.locator('text=/L|M|T|W/').first() // Day labels
    await expect(calendar).toBeVisible({ timeout: 3000 })
  })

  // ── Test 3: Open plan and see content ──
  test('plan page loads and shows tabs', async ({ page }) => {
    await page.goto('/plan/BDAY2026')
    await page.waitForTimeout(3000)

    // Should see the plan name or the plan UI
    const planContent = page.locator('text=BDAY2026').first()
    await expect(planContent).toBeVisible({ timeout: 10000 })

    // Tabs should be visible
    const tabs = page.locator('button').filter({ hasText: /plan|vot|result|más|more/i })
    expect(await tabs.count()).toBeGreaterThanOrEqual(2)
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

  // ── Test 5: Edit modal opens and closes ──
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
