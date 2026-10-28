import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { parseContactWidgetConfig, parseSiteSettings, type ContactSubmittedPayload } from '@staticdesk/core'

import { newMessageEmail } from '../../server/emails/new-message'
import { attachmentPath, checkAttachmentFiles } from '../../server/utils/contact/attachments'
import { resolveContactForm, validateContactFields } from '../../server/utils/contact/submit'
import { allowedSiteUrl, formOrigin, formPageLocale, renderFormPage } from '../../server/utils/public/form'
import type { PublicSite } from '../../server/utils/public/site'
import { buildWebhookRequest, deliverWebhook, isPrivateAddress, signWebhook } from '../../server/utils/webhooks'

const site: PublicSite = {
  id: 'site-1',
  workspaceId: 'ws-1',
  name: 'Docs',
  allowedOrigins: ['https://docs.acme.dev'],
  settings: parseSiteSettings({ allowLocalhost: false }),
  widgets: [{
    id: 'w-1',
    kind: 'contact',
    name: 'Contact',
    config: {
      nameField: 'required',
      fields: [{ id: 'company', type: 'text', label: 'Company', required: true }],
    },
  }],
}

const payload: ContactSubmittedPayload = {
  type: 'contact.submitted',
  id: 'delivery-1',
  createdAt: '2026-10-29T10:00:00.000Z',
  site: { id: 'site-1', name: 'Docs' },
  widget: { id: 'w-1', name: 'Contact' },
  threadId: 'thread-1',
  contact: { email: 'ada@example.com', name: 'Ada' },
  message: 'Hello <@here> & @everyone',
  fields: [{ id: 'company', label: 'Company', value: 'Acme' }],
  attachments: [{ name: 'notes.pdf', size: 2048, contentType: 'application/pdf' }],
  page: { id: '/pricing', url: 'https://docs.acme.dev/pricing' },
}

describe('resolveContactForm', () => {
  it('uses the configuration of the matching contact widget', () => {
    const form = resolveContactForm(site, 'w-1')
    expect(form.widget).toEqual({ id: 'w-1', name: 'Contact' })
    expect(form.config.fields.map(field => field.id)).toEqual(['company'])
  })

  it('falls back to the default form for unknown widgets', () => {
    expect(resolveContactForm(site, 'other')).toEqual({ widget: null, config: parseContactWidgetConfig({}) })
  })
})

describe('validateContactFields', () => {
  const { config } = resolveContactForm(site, 'w-1')

  it('returns the name and field values', () => {
    expect(validateContactFields(config, { name: ' Ada ', fields: { company: 'Acme' } }))
      .toEqual({ ok: true, name: 'Ada', values: { company: 'Acme' } })
  })

  it('reports a missing required name and field', () => {
    const result = validateContactFields(config, { fields: {} })
    expect(result.ok).toBe(false)
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['company', 'name'])
  })

  it('drops the name when the form hides it', () => {
    const hidden = parseContactWidgetConfig({ nameField: 'hidden' })
    expect(validateContactFields(hidden, { name: 'Ada' })).toEqual({ ok: true, name: undefined, values: {} })
  })
})

describe('plain HTML forms', () => {
  it('reads the posting origin from Origin, then Referer', () => {
    expect(formOrigin({ origin: 'https://docs.acme.dev' })).toBe('https://docs.acme.dev')
    expect(formOrigin({ origin: 'null', referer: 'https://docs.acme.dev/contact?x=1' })).toBe('https://docs.acme.dev')
    expect(formOrigin({ referer: 'not a url' })).toBeNull()
    expect(formOrigin({})).toBeNull()
  })

  it('only redirects to the site\'s allowed origins', () => {
    expect(allowedSiteUrl('https://docs.acme.dev/thanks', site)).toBe('https://docs.acme.dev/thanks')
    expect(allowedSiteUrl('https://evil.dev/phish', site)).toBeNull()
    expect(allowedSiteUrl('javascript:alert(1)', site)).toBeNull()
    expect(allowedSiteUrl(undefined, site)).toBeNull()
  })

  it('picks the page language', () => {
    expect(formPageLocale('fr', 'en-US')).toBe('fr')
    expect(formPageLocale(null, 'fr-FR,fr;q=0.9')).toBe('fr')
    expect(formPageLocale(null, undefined)).toBe('en')
  })

  it('renders an escaped result page', () => {
    const html = renderFormPage({ locale: 'en', outcome: 'error', message: '<script>', details: ['email: <b>'], backUrl: 'https://docs.acme.dev/?a="b"' })
    expect(html).toContain('Your message was not sent')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<li>email: &lt;b&gt;</li>')
    expect(html).toContain('href="https://docs.acme.dev/?a=&quot;b&quot;"')
    expect(html).not.toContain('<script>')
  })
})

describe('newMessageEmail', () => {
  it('replies to the visitor and lists the fields', () => {
    const email = newMessageEmail({
      to: 'team@acme.dev',
      siteName: 'Docs',
      contact: payload.contact,
      message: 'First line\n<b>second</b>',
      fields: payload.fields,
      attachments: payload.attachments,
      pageUrl: payload.page.url,
      dashboardUrl: 'https://staticdesk.app/app',
    })
    expect(email.replyTo).toBe('ada@example.com')
    expect(email.subject).toBe('[Docs] First line')
    expect(email.text).toContain('Company: Acme')
    expect(email.text).toContain('Page: https://docs.acme.dev/pricing')
    expect(email.text).toContain('Attachments: notes.pdf (2 kB)')
    expect(email.html).toContain('&lt;b&gt;second&lt;/b&gt;')
  })
})

describe('webhooks', () => {
  const custom = { id: 'h-1', kind: 'custom' as const, url: 'https://hooks.example.com/in', secret: 'whsec_test' }

  it('signs custom webhook bodies', () => {
    const request = buildWebhookRequest(custom, payload, 1_790_000_000_000)
    expect(JSON.parse(request.body)).toEqual(payload)
    expect(request.headers['StaticDesk-Event']).toBe('contact.submitted')
    const expected = createHmac('sha256', 'whsec_test').update(`1790000000.${request.body}`).digest('hex')
    expect(request.headers['StaticDesk-Signature']).toBe(`t=1790000000,v1=${expected}`)
    expect(signWebhook('whsec_test', request.body, 1_790_000_000)).toBe(request.headers['StaticDesk-Signature'])
  })

  it('formats Slack messages with escaped text', () => {
    const { text } = JSON.parse(buildWebhookRequest({ ...custom, kind: 'slack' }, payload).body)
    expect(text).toContain('*New message on Docs* from Ada (ada@example.com)')
    expect(text).toContain('• Company: Acme')
    expect(text).toContain('&lt;@here&gt; &amp; @everyone')
  })

  it('formats Discord messages without mentions', () => {
    const body = JSON.parse(buildWebhookRequest({ ...custom, kind: 'discord' }, payload).body)
    expect(body.content).toContain('**New message on Docs**')
    expect(body.allowed_mentions).toEqual({ parse: [] })
  })

  it('detects internal addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(address), address).toBe(true)
    }
    expect(isPrivateAddress('93.184.216.34')).toBe(false)
    expect(isPrivateAddress('2606:4700::1111')).toBe(false)
  })

  it('reports delivery outcomes without following redirects', async () => {
    const target = { ...custom, url: 'https://93.184.216.34/hook' }
    const request = buildWebhookRequest(target, payload)

    const ok = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    expect(await deliverWebhook(target, request, ok)).toEqual({ ok: true, status: 204, error: null })
    expect(ok.mock.calls[0]![1]).toMatchObject({ method: 'POST', redirect: 'manual' })

    const failing = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    expect(await deliverWebhook(target, request, failing)).toEqual({ ok: false, status: 500, error: 'HTTP 500' })

    const offline = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    expect(await deliverWebhook(target, request, offline)).toEqual({ ok: false, status: null, error: 'connect ECONNREFUSED' })
  })

  it('refuses internal URLs before sending anything', async () => {
    const fetcher = vi.fn()
    const target = { ...custom, url: 'https://127.0.0.1/hook' }
    expect((await deliverWebhook(target, buildWebhookRequest(target, payload), fetcher)).ok).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('attachments', () => {
  it('stores files under the workspace and site, with a safe name', () => {
    expect(attachmentPath(site, 'a-1', '../Résumé.pdf')).toBe('ws-1/site-1/a-1/Resume.pdf')
  })

  it('checks the number, type and size of posted files', () => {
    const file = (name: string, type: string, size = 10) => ({ name, type, data: Buffer.alloc(size) })
    expect(checkAttachmentFiles([file('a.pdf', 'application/pdf')])).toEqual([])
    expect(checkAttachmentFiles([file('a.html', 'text/html')])).toEqual(['a.html: this file type is not accepted'])
    expect(checkAttachmentFiles([file('big.png', 'image/png', 6 * 1024 * 1024)])).toEqual(['big.png: this file is too large'])
    expect(checkAttachmentFiles(Array.from({ length: 4 }, (_, i) => file(`${i}.png`, 'image/png')))).toEqual(['Attach at most 3 files'])
    expect(checkAttachmentFiles([file('a.png', 'image/png')], 3)).toEqual(['Attach at most 3 files'])
  })
})
