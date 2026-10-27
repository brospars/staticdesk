import { expect, test } from '@playwright/test'

test('dashboard redirects to the login page without a session', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
})

test('login form validates the email', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByRole('button', { name: 'Send magic link' }).click()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
})
