import { expect, test, type Page } from '@playwright/test'

// Comments and reactions on a static site on another origin. The public API is
// mocked in the browser: these tests cover the widget elements.
const SITE_ORIGIN = 'https://docs.example.test'
const SITE_KEY = 'pk_demo000000000000000000'

const config = {
  site: { name: 'Demo docs' },
  locale: null,
  theme: { primaryColor: null, mode: 'light' },
  turnstileSiteKey: null,
  attachments: { maxFiles: 3, maxBytes: 5242880, accept: '' },
  widgets: [
    { id: '44444444-4444-4444-4444-000000000002', kind: 'comments', config: { title: null, allowAnonymous: true, sort: 'oldest' } },
    { id: '44444444-4444-4444-4444-000000000003', kind: 'reactions', config: { title: null, helpful: true, askComment: true, emojis: ['🎉'] } },
  ],
}

const existing = {
  id: '55555555-5555-5555-5555-000000000001',
  parentId: null,
  author: 'Ada',
  body: 'Is there a **CLI**?',
  deleted: false,
  createdAt: '2026-10-28T10:00:00.000Z',
  editedAt: null,
  replies: [],
}

test.use({ permissions: ['local-network-access'] })

async function setup(page: Page, baseURL: string) {
  const requests: { method: string, path: string, body: unknown }[] = []

  await page.route(`${SITE_ORIGIN}/**`, route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="en"><head><title>Docs</title></head><body>
      <h1>Getting started</h1>
      <script src="${baseURL}/widget.js" data-site="${SITE_KEY}" defer></script>
      <staticdesk-reactions></staticdesk-reactions>
      <staticdesk-comments></staticdesk-comments>
    </body></html>`,
  }))

  const prefix = `/api/v1/public/sites/${SITE_KEY}/`
  await page.route(`${baseURL}${prefix}**`, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.slice(prefix.length)
    const headers = {
      'Access-Control-Allow-Origin': SITE_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    requests.push({ method: request.method(), path, body: request.postData() ? JSON.parse(request.postData()!) : null })

    if (path === 'config') return route.fulfill({ json: config, headers })
    if (path === 'reactions' && request.method() === 'GET') return route.fulfill({ json: { counts: { 'emoji:🎉': 2 } }, headers })
    if (path === 'reactions') {
      const { kind } = request.postDataJSON() as { kind: string }
      return route.fulfill({ status: 201, json: { id: `66666666-6666-6666-6666-00000000000${kind === 'unhelpful' ? 1 : 2}`, token: 'reaction-token-0123456789', counts: { 'emoji:🎉': kind === 'emoji:🎉' ? 3 : 2 } }, headers })
    }
    if (path.startsWith('reactions/')) return route.fulfill({ json: { ok: true }, headers })
    if (path === 'comments' && request.method() === 'GET') return route.fulfill({ json: { comments: [existing], total: 1, nextOffset: null }, headers })
    if (path === 'comments') {
      const body = request.postDataJSON() as { body: string, parentId?: string }
      return route.fulfill({
        status: 201,
        json: {
          comment: { ...existing, id: '55555555-5555-5555-5555-000000000002', parentId: body.parentId ?? null, author: null, body: body.body, createdAt: new Date().toISOString() },
          status: 'pending',
          token: 'comment-token-0123456789',
        },
        headers,
      })
    }
    return route.fulfill({ status: 204, headers })
  })

  await page.goto(`${SITE_ORIGIN}/guide/`)
  return requests
}

test('visitors vote, explain a "no" and react with an emoji', async ({ page, baseURL }) => {
  const requests = await setup(page, baseURL!)
  const reactions = page.locator('staticdesk-reactions')

  await reactions.getByRole('button', { name: 'No' }).click()
  await reactions.getByLabel('What could we improve?').fill('A diagram would help')
  await reactions.getByRole('button', { name: 'Send' }).click()
  await expect(reactions.getByText('your comment helps us improve this page')).toBeVisible()
  expect(requests).toContainEqual({ method: 'PATCH', path: 'reactions/66666666-6666-6666-6666-000000000001', body: { token: 'reaction-token-0123456789', comment: 'A diagram would help' } })

  const emoji = reactions.getByRole('button', { name: 'React with 🎉 (2)' })
  await emoji.click()
  await expect(reactions.getByRole('button', { name: 'React with 🎉 (3)' })).toHaveAttribute('aria-pressed', 'true')
  expect(requests.find(r => r.method === 'POST' && (r.body as { kind: string }).kind === 'emoji:🎉')?.body).toMatchObject({ pageId: '/guide' })
})

test('visitors reply anonymously and see their comment awaiting moderation', async ({ page, baseURL }) => {
  const requests = await setup(page, baseURL!)
  const comments = page.locator('staticdesk-comments')

  await expect(comments.getByRole('heading', { name: 'Comments (1)' })).toBeVisible()
  await expect(comments.locator('strong', { hasText: 'CLI' })).toBeVisible()

  await comments.getByRole('button', { name: 'Reply' }).click()
  const reply = comments.locator('li form')
  await reply.getByRole('textbox', { name: 'Comment' }).fill('Yes: `npx staticdesk`')
  // The server rejects submissions faster than a human could type.
  await page.waitForTimeout(2100)
  await reply.getByRole('button', { name: 'Post reply' }).click()

  await expect(comments.getByText('Awaiting moderation')).toBeVisible()
  await expect(comments.locator('.sd-replies code')).toHaveText('npx staticdesk')
  expect(requests.find(r => r.method === 'POST' && r.path === 'comments')?.body).toMatchObject({
    parentId: existing.id,
    body: 'Yes: `npx staticdesk`',
    pageId: '/guide',
    widgetId: config.widgets[0]!.id,
  })
})
