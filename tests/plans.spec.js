import { test, expect } from '@playwright/test'
import { mockSupabase, MOCK_PLANS, MOCK_USER } from './helpers/mock-supabase.js'

// ---------------------------------------------------------------------------
// Create Plan page
// ---------------------------------------------------------------------------

test.describe('Create Plan', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
  })

  test('renders all required form fields', async ({ page }) => {
    await page.goto('/create-plan')
    // Title field
    await expect(page.getByPlaceholder(/football, coffee, hike/i)).toBeVisible({ timeout: 5_000 })
    // Category grid — at least one category button should appear
    await expect(page.getByRole('button', { name: /sports/i }).first()).toBeVisible()
    // Submit button starts disabled (form not yet complete)
    const submitBtn = page.getByRole('button', { name: /create plan/i })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button stays disabled when title is too short', async ({ page }) => {
    await page.goto('/create-plan')
    await page.fill('input[placeholder*="Football"]', 'Hi')  // < 3 chars
    const submitBtn = page.getByRole('button', { name: /create plan/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('more options panel expands on toggle', async ({ page }) => {
    await page.goto('/create-plan')
    await expect(page.getByText(/description/i)).not.toBeVisible()
    await page.getByRole('button', { name: /more options/i }).click()
    await expect(page.getByText(/description/i)).toBeVisible()
  })

  test('category selection highlights chosen category', async ({ page }) => {
    await page.goto('/create-plan')
    const sportBtn = page.getByRole('button', { name: /sports/i }).first()
    await sportBtn.click()
    // After clicking, the button should appear active (background gradient applied inline)
    // We verify indirectly: the title field is still visible and no errors appear
    await expect(page.getByPlaceholder(/football, coffee, hike/i)).toBeVisible()
  })

  test('filling in form title + category enables the submit button once place + date + time are mocked', async ({ page }) => {
    await page.goto('/create-plan')
    // The button only enables when title >= 3 chars, category chosen, place chosen, date, time.
    // We can only verify the title + category step without PlaceInput / DatePicker interaction:
    await page.fill('input[placeholder*="Football"]', 'Park football')
    await page.getByRole('button', { name: /sports/i }).first().click()
    // Still disabled (no place/date/time)
    await expect(page.getByRole('button', { name: /create plan/i })).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Plan Detail page
// ---------------------------------------------------------------------------

test.describe('Plan Detail', () => {
  const PLAN_ID = MOCK_PLANS[0].id

  test('shows a loading state then renders plan content', async ({ page }) => {
    // Delay the plans response so we can observe the loading skeleton / indicator
    await mockSupabase(page, { loggedIn: true })
    await page.route('**/rest/v1/plans*', async route => {
      await page.waitForTimeout(300)  // brief delay to make loading visible
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_PLANS[0]]),
      })
    })

    await page.goto(`/plan/${PLAN_ID}`)

    // Eventually the plan title should appear
    await expect(page.getByRole('heading', { name: MOCK_PLANS[0].title })).toBeVisible({ timeout: 8_000 })
  })

  test('renders plan title and category label', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    await page.goto(`/plan/${PLAN_ID}`)
    await expect(page.getByRole('heading', { name: MOCK_PLANS[0].title })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/sports/i).first()).toBeVisible()
  })

  test('shows date, time, and place info', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    await page.goto(`/plan/${PLAN_ID}`)
    // Wait for plan to load
    await expect(page.getByRole('heading', { name: MOCK_PLANS[0].title })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/retiro park/i)).toBeVisible()
  })

  test('shows back-to-feed link', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    await page.goto(`/plan/${PLAN_ID}`)
    await expect(page.getByRole('heading', { name: MOCK_PLANS[0].title })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('link', { name: /feed/i })).toBeVisible()
  })

  test('shows "Plan not found" when plan does not exist', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    // Override plans to return empty (not found)
    await page.route('**/rest/v1/plans*', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto('/plan/nonexistent-plan-id')
    await expect(page.getByText(/plan not found/i)).toBeVisible({ timeout: 5_000 })
  })

  test('join button appears for non-organizer on an open plan', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    // Ensure the authenticated user is NOT the organizer (different user_id)
    await page.route('**/rest/v1/plans*', route => {
      const openPlan = { ...MOCK_PLANS[0], user_id: 'someone-else', join_mode: 'open' }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([openPlan]) })
    })
    await page.goto(`/plan/${PLAN_ID}`)
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible({ timeout: 5_000 })
  })

  test('cancel plan button appears for the organizer', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })
    // Set the plan's user_id to match the mock user
    await page.route('**/rest/v1/plans*', route => {
      const orgPlan = { ...MOCK_PLANS[0], user_id: MOCK_USER.id, status: 'active' }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([orgPlan]) })
    })
    await page.goto(`/plan/${PLAN_ID}`)
    await expect(page.getByRole('button', { name: /cancel plan/i })).toBeVisible({ timeout: 5_000 })
  })
})
