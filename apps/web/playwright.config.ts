import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PORT ?? 3000)

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    // Lets environments with a preinstalled Chromium skip `playwright install`.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Runs against the production build: `pnpm build` first.
  webServer: {
    command: 'node .output/server/index.mjs',
    port,
    reuseExistingServer: !process.env.CI,
    env: {
      // Public pages do not query Supabase; local defaults let the app boot.
      NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY ?? 'e2e-placeholder-key',
    },
  },
})
