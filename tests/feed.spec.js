import { test, expect } from '@playwright/test'
import { mockSupabase, MOCK_PLANS } from './helpers/mock-supabase.js'

// ---------------------------------------------------------------------------
// Feed page
// ---------------------------------------------------------------------------

test.describe('Feed — unauthenticated', () => {
  test('shows landing page with get-started and log-in CTAs', async ({ page }) => {
    await mockSupabase(page, { loggedIn: false })
    await page.goto('/')
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
    // Brand mark
    await expect(page.getByText('queda')).toBeVisible()
  })

  test('get-started link goes to signup page', async ({ page }) => {
    await mockSupabase(page, { loggedIn: false })
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('log-in link goes to login page', async ({ page }) => {
    await mockSupabase(page, { loggedIn: false })
    await page.goto('/')
    await page.getByRole('link', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Feed — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, plans: MOCK_PLANS })
  })

  test('renders plan cards after loading', async ({ page }) => {
    await page.goto('/')
    // Wait for plan titles to appear
    await expect(page.getByText(MOCK_PLANS[0].title)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(MOCK_PLANS[1].title)).toBeVisible()
  })

  test('shows category filter pills including "All"', async ({ page }) => {
    await page.goto('/')
    // "All" pill should be present and active by default
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible({ timeout: 5_000 })
  })

  test('category filter pill click triggers a re-fetch (stays on page)', async ({ page }) => {
    let fetchCount = 0
    await page.route('**/rest/v1/plans*', route => {
      fetchCount++
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PLANS) })
    })
    await page.goto('/')
    // Wait for initial load
    await expect(page.getByText(MOCK_PLANS[0].title)).toBeVisible({ timeout: 8_000 })
    const initialFetches = fetchCount

    // Click a category pill (Sports)
    await page.getByRole('button', { name: /sports/i }).first().click()

    // A new fetch should be triggered
    await page.waitForTimeout(500)
    expect(fetchCount).toBeGreaterThan(initialFetches)
    // Still on the feed page
    await expect(page).toHaveURL('/')
  })

  test('clicking "All" pill after a category resets the filter', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(MOCK_PLANS[0].title)).toBeVisible({ timeout: 8_000 })

    // Click a category filter
    await page.getByRole('button', { name: /sports/i }).first().click()
    // Click "All" to reset
    await page.getByRole('button', { name: 'All' }).click()

    await expect(page).toHaveURL('/')
  })

  test('shows empty state when no plans are returned', async ({ page }) => {
    await page.route('**/rest/v1/plans*', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto('/')
    await expect(page.getByText(/nothing happening yet/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('link', { name: /create a plan/i })).toBeVisible()
  })

  test('hero card links to the plan detail page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(MOCK_PLANS[0].title)).toBeVisible({ timeout: 8_000 })
    // Hero card wraps in an <a> tag — clicking it navigates to /plan/:id
    await page.getByText(MOCK_PLANS[0].title).first().click()
    await expect(page).toHaveURL(new RegExp(`/plan/${MOCK_PLANS[0].id}`), { timeout: 5_000 })
  })
})
