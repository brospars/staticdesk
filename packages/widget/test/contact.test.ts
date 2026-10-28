import type { PublicSiteConfig } from '@staticdesk/core'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, type Api } from '../src/api'
import { StaticDeskContact } from '../src/elements/contact'
import { setRuntime } from '../src/runtime'

const site: PublicSiteConfig = {
  site: { name: 'Docs' },
  locale: null,
  theme: { primaryColor: '#e11d48', mode: 'auto' },
  turnstileSiteKey: null,
  widgets: [{
    id: 'w-contact',
    kind: 'contact',
    config: { title: 'Talk to us', description: null, buttonLabel: null, successMessage: null, position: 'bottom-left' },
  }],
}

const api = {
  config: vi.fn<Api['config']>(),
  track: vi.fn<Api['track']>(),
  submitContact: vi.fn<Api['submitContact']>(),
}

beforeAll(() => {
  customElements.define('staticdesk-contact', StaticDeskContact)
})

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
  api.config.mockResolvedValue(site)
  api.submitContact.mockResolvedValue()
  setRuntime({ config: { siteKey: 'pk_test', apiBase: 'https://staticdesk.app', locale: null }, api })
})

async function mount(attributes: Record<string, string> = {}) {
  const element = document.createElement('staticdesk-contact') as StaticDeskContact
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  document.body.append(element)
  await vi.waitFor(() => expect(element.shadowRoot!.querySelector('form')).not.toBeNull())
  return { element, root: element.shadowRoot! }
}

function fill(root: ShadowRoot, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!
    input.value = value
  }
}

describe('<staticdesk-contact>', () => {
  it('renders an inline form with the configured title and theme', async () => {
    const { root } = await mount()
    expect(root.querySelector('h2')!.textContent).toBe('Talk to us')
    expect(root.querySelector('style')!.textContent).toContain('--sd-primary: #e11d48')
    expect(root.querySelector('[role="dialog"]')).toBeNull()
  })

  it('translates the interface', async () => {
    const { root } = await mount({ locale: 'fr' })
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent).toBe('Envoyer le message')
  })

  it('opens and closes the floating dialog accessibly', async () => {
    const { element, root } = await mount({ mode: 'floating' })
    const trigger = root.querySelector<HTMLButtonElement>('.sd-trigger')!
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!
    expect(trigger.classList.contains('sd-left')).toBe(true)
    expect(dialog.hidden).toBe(true)

    trigger.click()
    expect(dialog.hidden).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(root.activeElement).toBe(root.querySelector('[name="name"]'))
    expect(api.track).toHaveBeenCalledWith(expect.objectContaining({ type: 'open', widgetId: 'w-contact' }))

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(dialog.hidden).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(root.activeElement).toBe(trigger)

    element.open()
    expect(dialog.hidden).toBe(false)
  })

  it('keeps keyboard focus inside the dialog', async () => {
    const { root } = await mount({ mode: 'floating' })
    root.querySelector<HTMLButtonElement>('.sd-trigger')!.click()
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!
    const close = root.querySelector<HTMLButtonElement>('.sd-close')!
    const submit = root.querySelector<HTMLButtonElement>('.sd-submit')!

    submit.focus()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(root.activeElement).toBe(close)

    close.focus()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(root.activeElement).toBe(submit)
  })

  it('submits the message with page and anti-spam fields', async () => {
    const { root } = await mount()
    fill(root, { name: ' Ada ', email: 'ada@example.com', message: 'Hello!' })
    root.querySelector('form')!.requestSubmit()

    await vi.waitFor(() => expect(root.querySelector<HTMLElement>('.sd-success')!.hidden).toBe(false))
    expect(api.submitContact).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello!',
      widgetId: 'w-contact',
      pageId: '/',
      website: undefined,
    }))
    expect(api.submitContact.mock.calls[0]![0].elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('does not submit an invalid form', async () => {
    const { root } = await mount()
    fill(root, { email: 'not-an-email', message: '' })
    root.querySelector('form')!.requestSubmit()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(api.submitContact).not.toHaveBeenCalled()
  })

  it('shows a rate-limit message', async () => {
    api.submitContact.mockRejectedValue(new ApiError(429, 'Too many requests'))
    const { root } = await mount()
    fill(root, { email: 'ada@example.com', message: 'Hello' })
    root.querySelector('form')!.requestSubmit()
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')!.textContent).toBe('Too many messages. Please try again later.'))
    expect(root.querySelector<HTMLButtonElement>('.sd-submit')!.disabled).toBe(false)
  })

  it('renders and submits custom fields', async () => {
    api.config.mockResolvedValue({
      ...site,
      widgets: [{
        ...site.widgets[0]!,
        config: {
          ...site.widgets[0]!.config,
          nameField: 'hidden',
          fields: [
            { id: 'company', type: 'text', label: 'Company', required: true, placeholder: null, options: [] },
            { id: 'topic', type: 'select', label: 'Topic', required: false, placeholder: null, options: ['Sales', 'Support'] },
            { id: 'consent', type: 'checkbox', label: 'I agree', required: true, placeholder: null, options: [] },
          ],
        },
      }],
    })
    const { root } = await mount()
    expect(root.querySelector('[name="name"]')).toBeNull()
    expect(root.querySelector<HTMLInputElement>('[name="field:company"]')!.required).toBe(true)
    expect([...root.querySelectorAll('select option')].map(option => option.textContent)).toEqual(['Choose…', 'Sales', 'Support'])

    fill(root, { 'email': 'ada@example.com', 'message': 'Hello', 'field:company': ' Acme ', 'field:topic': 'Support' })
    root.querySelector<HTMLInputElement>('[name="field:consent"]')!.checked = true
    root.querySelector('form')!.requestSubmit()

    await vi.waitFor(() => expect(api.submitContact).toHaveBeenCalled())
    expect(api.submitContact.mock.calls[0]![0].fields).toEqual({ company: 'Acme', topic: 'Support', consent: true })
  })

  it('shows the configured error message', async () => {
    api.config.mockResolvedValue({
      ...site,
      widgets: [{ ...site.widgets[0]!, config: { ...site.widgets[0]!.config, errorMessage: 'Write to hello@acme.dev instead.' } }],
    })
    api.submitContact.mockRejectedValue(new ApiError(500, 'Boom'))
    const { root } = await mount()
    fill(root, { email: 'ada@example.com', message: 'Hello' })
    root.querySelector('form')!.requestSubmit()
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')!.textContent).toBe('Write to hello@acme.dev instead.'))
  })

  it('renders nothing when the site has no contact widget', async () => {
    api.config.mockResolvedValue({ ...site, widgets: [] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const element = document.createElement('staticdesk-contact')
    document.body.append(element)
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(element.shadowRoot!.querySelector('form')).toBeNull()
  })
})
