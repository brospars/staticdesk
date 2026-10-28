import { expect, test, type Page } from '@playwright/test'

// A static site on another origin embeds the widget served by the app.
// The public API is mocked in the browser: these tests cover the widget.
const SITE_ORIGIN = 'https://docs.example.test'
const SITE_KEY = 'pk_demo000000000000000000'

const config = {
  site: { name: 'Demo docs' },
  locale: null,
  theme: { primaryColor: '#e11d48', mode: 'auto' },
  turnstileSiteKey: null,
  widgets: [{
    id: '44444444-4444-4444-4444-000000000001',
    kind: 'contact',
    config: { title: 'Talk to us', description: null, buttonLabel: null, successMessage: null, position: 'bottom-right' },
  }],
}

// The fake site is a public origin: let it load the widget from localhost
// without Chromium's Local Network Access prompt.
test.use({ permissions: ['local-network-access'] })

async function setup(page: Page, baseURL: string, { contactStatus = 201 } = {}) {
  const requests: { path: string, body: unknown }[] = []

  await page.route(`${SITE_ORIGIN}/**`, route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="en"><head><title>Docs</title></head><body>
      <h1>Getting started</h1>
      <script src="${baseURL}/widget.js" data-site="${SITE_KEY}" defer></script>
      <staticdesk-contact mode="floating"></staticdesk-contact>
    </body></html>`,
  }))

  await page.route(`${baseURL}/api/v1/public/sites/${SITE_KEY}/**`, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.split('/').pop()!
    requests.push({ path, body: request.postData() ? JSON.parse(request.postData()!) : null })
    const headers = { 'Access-Control-Allow-Origin': SITE_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path === 'config') return route.fulfill({ json: config, headers })
    if (path === 'contact') return route.fulfill({ status: contactStatus, json: { ok: true }, headers })
    return route.fulfill({ status: 204, headers })
  })

  await page.goto(`${SITE_ORIGIN}/guide/`)
  return requests
}

test('the floating contact form sends a message', async ({ page, baseURL }) => {
  const requests = await setup(page, baseURL!)
  await expect.poll(() => requests.find(r => r.path === 'events')?.body).toMatchObject({ type: 'view', pageId: '/guide' })

  await page.getByRole('button', { name: 'Contact us' }).click()
  const dialog = page.getByRole('dialog', { name: 'Talk to us' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('Name')).toBeFocused()

  await page.getByLabel('Name').fill('Ada')
  await page.getByLabel('Email').fill('ada@example.com')
  await page.getByLabel('Message').fill('Hello from the docs!')
  // The server rejects submissions faster than a human could type.
  await page.waitForTimeout(2100)
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(dialog.getByText('Message sent')).toBeVisible()
  const contact = requests.find(r => r.path === 'contact')!.body as Record<string, unknown>
  expect(contact).toMatchObject({
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hello from the docs!',
    pageId: '/guide',
    widgetId: config.widgets[0]!.id,
  })
  expect(contact.elapsedMs).toBeGreaterThanOrEqual(2000)
  expect(contact.website).toBeUndefined()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Contact us' })).toBeFocused()
})

test('errors are announced to the visitor', async ({ page, baseURL }) => {
  await setup(page, baseURL!, { contactStatus: 429 })
  await page.getByRole('button', { name: 'Contact us' }).click()
  await page.getByLabel('Email').fill('ada@example.com')
  await page.getByLabel('Message').fill('Hello')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('alert')).toHaveText('Too many messages. Please try again later.')
})

test('the widget is isolated from the page styles', async ({ page, baseURL }) => {
  await setup(page, baseURL!)
  await page.addStyleTag({ content: 'button { background: lime !important; display: none !important; }' })
  await expect(page.getByRole('button', { name: 'Contact us' })).toBeVisible()
})
