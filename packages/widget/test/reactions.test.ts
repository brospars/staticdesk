import type { PublicSiteConfig } from '@staticdesk/core'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { StaticDeskReactions } from '../src/elements/reactions'
import { setRuntime } from '../src/runtime'
import { mockApi } from './helpers'

const site: PublicSiteConfig = {
  site: { name: 'Docs' },
  locale: 'en',
  theme: { primaryColor: null, mode: 'auto' },
  turnstileSiteKey: null,
  attachments: { maxFiles: 3, maxBytes: 1024, accept: '' },
  widgets: [{
    id: 'w-reactions',
    kind: 'reactions',
    config: { title: null, helpful: true, askComment: true, emojis: ['🎉', '🚀'] },
  }],
}

const api = mockApi()

beforeAll(() => {
  customElements.define('staticdesk-reactions', StaticDeskReactions)
})

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.clearAllMocks()
  api.config.mockResolvedValue(site)
  api.reactions.mockResolvedValue({ counts: { 'emoji:🎉': 4 } })
  api.react.mockImplementation(async ({ kind }) => ({ id: `id-${kind}`, token: `token-${kind}`, counts: { 'emoji:🎉': 5 } }))
  api.unreact.mockResolvedValue({ counts: { 'emoji:🎉': 4 } })
  api.commentReaction.mockResolvedValue()
  setRuntime({ config: { siteKey: 'pk_test', apiBase: 'https://staticdesk.app', locale: null }, api })
})

async function mount(attributes: Record<string, string> = {}) {
  const element = document.createElement('staticdesk-reactions') as StaticDeskReactions
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  document.body.append(element)
  const root = element.shadowRoot!
  await vi.waitFor(() => expect(root.querySelector('[aria-label^="React with 🎉 (4)"]')).not.toBeNull())
  return root
}

const button = (root: ShadowRoot, text: string) =>
  [...root.querySelectorAll('button')].find(candidate => candidate.textContent!.includes(text))!

describe('<staticdesk-reactions>', () => {
  it('shows the question and the emoji counters of the page', async () => {
    const root = await mount({ 'page-id': '/guide' })
    expect(root.textContent).toContain('Was this page helpful?')
    expect(api.reactions).toHaveBeenCalledWith('/guide')
    expect(button(root, '🚀').getAttribute('aria-label')).toBe('React with 🚀 (0)')
  })

  it('toggles an emoji reaction and remembers it', async () => {
    const root = await mount({ 'page-id': '/guide' })
    button(root, '🎉').click()
    await vi.waitFor(() => expect(button(root, '🎉').getAttribute('aria-pressed')).toBe('true'))
    expect(api.react).toHaveBeenCalledWith(expect.objectContaining({ kind: 'emoji:🎉', widgetId: 'w-reactions', pageId: '/guide' }))
    expect(button(root, '🎉').textContent).toContain('5')
    expect(JSON.parse(localStorage.getItem('staticdesk:reactions:pk_test:/guide')!)).toEqual({ 'emoji:🎉': { id: 'id-emoji:🎉', token: 'token-emoji:🎉' } })

    button(root, '🎉').click()
    await vi.waitFor(() => expect(button(root, '🎉').getAttribute('aria-pressed')).toBe('false'))
    expect(api.unreact).toHaveBeenCalledWith('id-emoji:🎉', 'token-emoji:🎉')
  })

  it('asks for a comment after a "no" and replaces the previous vote', async () => {
    const root = await mount()
    button(root, 'Yes').click()
    await vi.waitFor(() => expect(root.textContent).toContain('Thanks for your feedback!'))

    button(root, 'No').click()
    await vi.waitFor(() => expect(root.querySelector('textarea')).not.toBeNull())
    expect(api.unreact).toHaveBeenCalledWith('id-helpful', 'token-helpful')
    expect(button(root, 'Yes').getAttribute('aria-pressed')).toBe('false')

    root.querySelector('textarea')!.value = 'More examples please'
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(root.textContent).toContain('your comment helps us'))
    expect(api.commentReaction).toHaveBeenCalledWith('id-unhelpful', 'token-unhelpful', 'More examples please')
  })
})
