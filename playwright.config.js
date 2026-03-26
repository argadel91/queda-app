import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'
config()

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    locale: 'en-GB',
  },
  webServer: {
    command: 'npx vite --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
