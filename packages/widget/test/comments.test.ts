import type { PublicComment, PublicSiteConfig } from '@staticdesk/core'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { StaticDeskComments } from '../src/elements/comments'
import { setRuntime } from '../src/runtime'
import { mockApi } from './helpers'

const site: PublicSiteConfig = {
  site: { name: 'Docs' },
  locale: 'en',
  theme: { primaryColor: null, mode: 'auto' },
  turnstileSiteKey: null,
  attachments: { maxFiles: 3, maxBytes: 1024, accept: '' },
  widgets: [{ id: 'w-comments', kind: 'comments', config: { title: null, allowAnonymous: true, sort: 'oldest' } }],
}

const now = new Date().toISOString()
const comment = (id: string, values: Partial<PublicComment> = {}): PublicComment => ({
  id, parentId: null, author: 'Ada', body: 'Hello', deleted: false, createdAt: now, editedAt: null, replies: [], ...values,
})

const api = mockApi()

beforeAll(() => {
  customElements.define('staticdesk-comments', StaticDeskComments)
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.clearAllMocks()
  api.config.mockResolvedValue(site)
  api.comments.mockResolvedValue({
    comments: [
      comment('a1b2c3d4-0000-0000-0000-000000000001', {
        body: 'Great **page**',
        replies: [comment('a1b2c3d4-0000-0000-0000-000000000002', { parentId: 'a1b2c3d4-0000-0000-0000-000000000001', author: null, body: 'Agreed' })],
      }),
      comment('a1b2c3d4-0000-0000-0000-000000000003', { deleted: true, author: null, body: '', replies: [comment('r', { parentId: 'a1b2c3d4-0000-0000-0000-000000000003' })] }),
    ],
    total: 3,
    nextOffset: null,
  })
  setRuntime({ config: { siteKey: 'pk_test', apiBase: 'https://staticdesk.app', locale: null }, api })
})

async function mount() {
  const element = document.createElement('staticdesk-comments') as StaticDeskComments
  element.setAttribute('page-id', '/guide')
  document.body.append(element)
  const root = element.shadowRoot!
  await vi.waitFor(() => expect(root.querySelector('h2')!.textContent).toBe('Comments (3)'))
  return root
}

function submit(form: HTMLFormElement, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!.value = value
  }
  form.dispatchEvent(new Event('submit', { cancelable: true }))
}

describe('<staticdesk-comments>', () => {
  it('renders threads with Markdown, anonymous authors and deleted placeholders', async () => {
    const root = await mount()
    expect(api.comments).toHaveBeenCalledWith({ pageId: '/guide', widgetId: 'w-comments', offset: 0 })
    const items = root.querySelectorAll('.sd-list > li')
    expect(items).toHaveLength(2)
    expect(items[0]!.querySelector('strong')!.textContent).toBe('page')
    expect(items[0]!.querySelector('.sd-replies')!.textContent).toContain('Visitor #a1b2')
    expect(items[0]!.querySelector('.sd-replies')!.textContent).toContain('Anonymous')
    expect(items[1]!.textContent).toContain('This comment was deleted.')
  })

  it('posts a pending anonymous comment and lets its author delete it', async () => {
    const root = await mount()
    api.postComment.mockResolvedValue({
      comment: comment('a1b2c3d4-0000-0000-0000-000000000009', { author: null, body: 'New one' }),
      status: 'pending',
      token: 'secret-token-0123456789',
    })
    submit(root.querySelector('form')!, { body: 'New one' })

    await vi.waitFor(() => expect(root.textContent).toContain('will appear once a moderator approves it'))
    expect(api.postComment).toHaveBeenCalledWith(expect.objectContaining({ body: 'New one', name: undefined, pageId: '/guide', widgetId: 'w-comments' }))
    const item = root.querySelector('li[data-id="a1b2c3d4-0000-0000-0000-000000000009"]')!
    expect(item.textContent).toContain('Awaiting moderation')
    expect(root.querySelector('h2')!.textContent).toBe('Comments (3)')
    expect(JSON.parse(localStorage.getItem('staticdesk:comments:pk_test')!)).toEqual({ 'a1b2c3d4-0000-0000-0000-000000000009': 'secret-token-0123456789' })

    vi.stubGlobal('confirm', () => true)
    api.deleteComment.mockResolvedValue()
    const remove = [...item.querySelectorAll('button')].find(button => button.textContent === 'Delete')!
    remove.click()
    await vi.waitFor(() => expect(root.querySelector('li[data-id="a1b2c3d4-0000-0000-0000-000000000009"]')).toBeNull())
    expect(api.deleteComment).toHaveBeenCalledWith('a1b2c3d4-0000-0000-0000-000000000009', 'secret-token-0123456789')
  })

  it('replies in the thread of the comment', async () => {
    const root = await mount()
    api.postComment.mockResolvedValue({
      comment: comment('a1b2c3d4-0000-0000-0000-000000000010', { parentId: 'a1b2c3d4-0000-0000-0000-000000000001', body: 'Reply' }),
      status: 'approved',
      token: 'secret-token-0123456789',
    })
    const reply = root.querySelector('.sd-replies li')!.querySelector('button')!
    expect(reply.textContent).toBe('Reply')
    reply.click()
    const form = root.querySelector<HTMLFormElement>('.sd-list > li > form')!
    submit(form, { name: 'Grace', body: 'Reply' })
    await vi.waitFor(() => expect(root.querySelector('h2')!.textContent).toBe('Comments (4)'))
    expect(api.postComment).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Grace' }))
    expect(root.querySelector('.sd-list > li')!.querySelectorAll('.sd-replies > li')).toHaveLength(2)
    expect(root.querySelector('.sd-list > li > form')).toBeNull()
  })

  it('shows a preview of the Markdown', async () => {
    const root = await mount()
    const form = root.querySelector('form')!
    form.querySelector('textarea')!.value = '*hi*'
    const tabs = form.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[1]!.click()
    expect(form.querySelector('.sd-preview em')!.textContent).toBe('hi')
    expect(form.querySelector('textarea')!.hidden).toBe(true)
  })
})
