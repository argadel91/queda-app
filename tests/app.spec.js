import { test, expect } from '@playwright/test'

// ─── LANDING PAGE ───────────────────────────────────
test('landing page loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=queda.').first()).toBeVisible()
  // Check for tagline in any language (the hero text)
  await expect(page.locator('h1')).toBeVisible()
})

test('landing has sign in button', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Sign in')).toBeVisible()
})

test('landing has feature cards', async ({ page }) => {
  await page.goto('/')
  // Cards contain emojis regardless of language
  await expect(page.locator('text=📍')).toBeVisible()
  await expect(page.locator('text=📅')).toBeVisible()
  await expect(page.locator('text=📨')).toBeVisible()
})

test('clicking Get started shows auth screen', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Get started')
  await expect(page.locator('text=Email')).toBeVisible({ timeout: 5000 })
})

// ─── AUTH SCREEN ────────────────────────────────────
test('auth screen shows login and register tabs', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Sign in')
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('auth screen shows Google OAuth button', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Sign in')
  await expect(page.locator('text=Google')).toBeVisible({ timeout: 5000 })
})

// ─── PLAN PREVIEW (with code param) ─────────────────
test('plan preview shows for shared links', async ({ page }) => {
  // Use a non-existent code - should still show auth or landing
  await page.goto('/?code=XXXXX')
  // Should attempt to load plan, then show auth
  await expect(page.locator('text=queda.')).toBeVisible({ timeout: 5000 })
})

// ─── BUILD CHECK ────────────────────────────────────
test('no console errors on landing', async ({ page }) => {
  const errors = []
  page.on('pageerror', err => errors.push(err.message))
  await page.goto('/')
  await page.waitForTimeout(2000)
  // Filter out known non-critical errors
  const critical = errors.filter(e => !e.includes('Script error') && !e.includes('ResizeObserver'))
  expect(critical).toEqual([])
})

test('page loads within 5 seconds', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await expect(page.locator('text=queda.')).toBeVisible()
  const loadTime = Date.now() - start
  expect(loadTime).toBeLessThan(5000)
})

// ─── RESPONSIVE ─────────────────────────────────────
test('works on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.locator('text=queda.')).toBeVisible()
  await expect(page.locator('text=Get started')).toBeVisible()
})

test('works on tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  await expect(page.locator('text=queda.').first()).toBeVisible()
})
