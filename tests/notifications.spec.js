import { test, expect } from '@playwright/test'
import { mockSupabase, MOCK_NOTIFICATIONS } from './helpers/mock-supabase.js'

// ---------------------------------------------------------------------------
// Notifications page
// ---------------------------------------------------------------------------

test.describe('Notifications', () => {
  test('page renders heading', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: [] })
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({ timeout: 5_000 })
  })

  test('shows empty state when there are no notifications', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: [] })
    await page.goto('/notifications')
    await expect(page.getByText(/nothing yet/i)).toBeVisible({ timeout: 5_000 })
  })

  test('renders notification items when notifications exist', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: MOCK_NOTIFICATIONS })
    await page.goto('/notifications')
    // First notification's title
    await expect(page.getByText(MOCK_NOTIFICATIONS[0].title)).toBeVisible({ timeout: 5_000 })
    // Second notification's title
    await expect(page.getByText(MOCK_NOTIFICATIONS[1].title)).toBeVisible()
  })

  test('"Mark all read" button appears when there are unread notifications', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: MOCK_NOTIFICATIONS })
    await page.goto('/notifications')
    // MOCK_NOTIFICATIONS[0] has read=false → unread > 0 → button should appear
    await expect(page.getByRole('button', { name: /mark all read/i })).toBeVisible({ timeout: 5_000 })
  })

  test('"Mark all read" button is absent when all notifications are read', async ({ page }) => {
    const allRead = MOCK_NOTIFICATIONS.map(n => ({ ...n, read: true }))
    await mockSupabase(page, { loggedIn: true, notifications: allRead })
    await page.goto('/notifications')
    await expect(page.getByText(allRead[0].title)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: /mark all read/i })).not.toBeVisible()
  })

  test('clicking "Mark all read" calls the update endpoint', async ({ page }) => {
    let markReadCalled = false
    await mockSupabase(page, { loggedIn: true, notifications: MOCK_NOTIFICATIONS })
    // Intercept the PATCH to notifications to detect the call
    await page.route('**/rest/v1/notifications*', route => {
      if (route.request().method() === 'PATCH') {
        markReadCalled = true
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_NOTIFICATIONS) })
      }
    })
    await page.goto('/notifications')
    await expect(page.getByRole('button', { name: /mark all read/i })).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /mark all read/i }).click()
    await page.waitForTimeout(500)
    expect(markReadCalled).toBe(true)
  })

  test('notification with a plan_id links to the plan detail page', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: MOCK_NOTIFICATIONS })
    await page.goto('/notifications')
    // The first notification links to /plan/plan-001
    const link = page.getByRole('link').filter({ hasText: MOCK_NOTIFICATIONS[0].title })
    await expect(link).toBeVisible({ timeout: 5_000 })
    const href = await link.getAttribute('href')
    expect(href).toContain(`/plan/${MOCK_NOTIFICATIONS[0].plan_id}`)
  })

  test('unread notification has full opacity; read notification has reduced opacity', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true, notifications: MOCK_NOTIFICATIONS })
    await page.goto('/notifications')
    // Unread (MOCK_NOTIFICATIONS[0]) link should have opacity 1
    const unreadLink = page.getByRole('link').filter({ hasText: MOCK_NOTIFICATIONS[0].title })
    await expect(unreadLink).toBeVisible({ timeout: 5_000 })
    const unreadOpacity = await unreadLink.evaluate(el => window.getComputedStyle(el).opacity)
    expect(parseFloat(unreadOpacity)).toBeCloseTo(1, 1)

    // Read (MOCK_NOTIFICATIONS[1]) link has opacity 0.55
    const readLink = page.getByRole('link').filter({ hasText: MOCK_NOTIFICATIONS[1].title })
    const readOpacity = await readLink.evaluate(el => window.getComputedStyle(el).opacity)
    expect(parseFloat(readOpacity)).toBeLessThan(1)
  })
})
