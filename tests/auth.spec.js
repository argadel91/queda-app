import { test, expect } from '@playwright/test'
import { mockSupabase, MOCK_SESSION } from './helpers/mock-supabase.js'

// ---------------------------------------------------------------------------
// Signup form validation
// ---------------------------------------------------------------------------

test.describe('Signup', () => {
  test('renders email and password fields with sign-up button', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  test('rejects password shorter than 8 characters (HTML5 minLength)', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/signup')
    await page.fill('input[type="email"]', 'valid@example.com')
    await page.fill('input[type="password"]', 'short')
    await page.getByRole('button', { name: /sign up/i }).click()
    // Browser-native validation prevents submission; we remain on /signup
    await expect(page).toHaveURL(/\/signup/)
  })

  test('shows email field as required — empty submit stays on page', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/signup')
    // Attempt submit with empty email
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('successful signup shows email-confirmation notice', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/signup')
    await page.fill('input[type="email"]', 'new@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.getByRole('button', { name: /sign up/i }).click()
    // Mock returns session=null, so the app shows a confirmation notice
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 5_000 })
  })

  test('has link to login page', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/signup')
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Login happy path
// ---------------------------------------------------------------------------

test.describe('Login', () => {
  test('renders email and password fields with log-in button', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })

  test('shows Supabase error message on wrong credentials', async ({ page }) => {
    await mockSupabase(page)
    // Override the token endpoint to return an auth error
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      })
    })
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'badpassword')
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible({ timeout: 5_000 })
  })

  test('happy path: successful login redirects to feed', async ({ page }) => {
    // Mock: no session initially, then login succeeds and subsequent session check returns user
    await mockSupabase(page, { loggedIn: false })
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) })
    })
    // After login, useAuth will call getSession again — return the session this time
    let loginDone = false
    await page.route('**/auth/v1/session', route => {
      if (loginDone) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: MOCK_SESSION.access_token, user: MOCK_SESSION.user }) })
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: null, user: null }) })
      }
    })
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'correctpassword')
    loginDone = true
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 8_000 })
  })

  test('has link to signup page', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
  test('sign-out button navigates user out of the profile page', async ({ page }) => {
    await mockSupabase(page, { loggedIn: true })

    // Simulate auth session in Supabase storage so the ProtectedRoute lets us in
    await page.addInitScript(() => {
      // Supabase PKCE client stores auth in localStorage under a key with the project ref
      // We inject a minimal token so the initial getSession() mock can return it.
      // The actual session comes from the mocked /auth/v1/session endpoint.
    })

    await page.goto('/profile')

    // Wait for the profile page to render (it checks for authenticated state)
    const signOutBtn = page.getByRole('button', { name: /sign out/i })
    await expect(signOutBtn).toBeVisible({ timeout: 5_000 })
    await signOutBtn.click()

    // After logout, the app should navigate away from the protected profile page
    await expect(page).not.toHaveURL('/profile', { timeout: 5_000 })
  })
})
