import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { dailyDigestEmail } from '../../server/emails/daily-digest'
import { threadReplyEmail } from '../../server/emails/thread-reply'
import { formatAddress, parseAddress, parseReplyAddress, replyAddress } from '../../server/utils/inbox/addresses'
import { extractReplyText, htmlToText, REPLY_MARKER } from '../../server/utils/inbox/reply-text'
import { verifySvixSignature } from '../../server/utils/inbox/svix'

const threadId = '66666666-6666-6666-6666-000000000001'

describe('addresses', () => {
  it('parses display names and bare addresses', () => {
    expect(parseAddress('Ada Lovelace <Ada@Example.com>')).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' })
    expect(parseAddress('"Lovelace, Ada" <ada@example.com>')).toEqual({ name: 'Lovelace, Ada', email: 'ada@example.com' })
    expect(parseAddress('<ada@example.com>')).toEqual({ name: null, email: 'ada@example.com' })
    expect(parseAddress(' ada@example.com ')).toEqual({ name: null, email: 'ada@example.com' })
  })

  it('quotes display names and strips line breaks', () => {
    expect(formatAddress('Ada "the Countess"\r\nBcc: x', 'ada@example.com')).toBe('"Ada \\"the Countess\\" Bcc: x" <ada@example.com>')
    expect(formatAddress(null, 'ada@example.com')).toBe('ada@example.com')
  })

  it('round-trips reply addresses', () => {
    const address = replyAddress('secret', threadId, 'in.staticdesk.app')
    expect(address).toMatch(/^reply\+[0-9a-f]{32}\.[0-9a-f]{16}@in\.staticdesk\.app$/)
    expect(address.split('@')[0]!.length).toBeLessThanOrEqual(64)
    expect(parseReplyAddress('secret', address, 'in.staticdesk.app')).toBe(threadId)
    expect(parseReplyAddress('secret', `Support <${address.toUpperCase()}>`, 'in.staticdesk.app')).toBe(threadId)
  })

  it('rejects forged or foreign reply addresses', () => {
    const address = replyAddress('secret', threadId, 'in.staticdesk.app')
    expect(parseReplyAddress('other', address, 'in.staticdesk.app')).toBeNull()
    expect(parseReplyAddress('secret', address, 'in.example.com')).toBeNull()
    expect(parseReplyAddress('secret', address.replace('666666', '777777'), 'in.staticdesk.app')).toBeNull()
    expect(parseReplyAddress('secret', 'hello@in.staticdesk.app', 'in.staticdesk.app')).toBeNull()
  })
})

describe('extractReplyText', () => {
  it('drops the quoted history after "On ... wrote:"', () => {
    const text = 'Thanks, it works now!\n\nOn Tue, Oct 28, 2026 at 10:00 AM Ada <ada@example.com> wrote:\n> Try this\n> and that'
    expect(extractReplyText(text)).toBe('Thanks, it works now!')
  })

  it('handles French clients and wrapped headers', () => {
    expect(extractReplyText('Merci !\n\nLe mar. 28 oct. 2026 à 10:00, Ada <ada@example.com> a écrit :\n> Bonjour')).toBe('Merci !')
    expect(extractReplyText('Great\n\nOn Tue, Oct 28, 2026 at 10:00 AM Ada Lovelace\n<ada@example.com> wrote:\n> Hi')).toBe('Great')
  })

  it('stops at the reply marker', () => {
    expect(extractReplyText(`Sounds good\n\n> ${REPLY_MARKER}\n> Previous answer`)).toBe('Sounds good')
  })

  it('keeps inline answers between quotes', () => {
    expect(extractReplyText('> Which version?\n2.1\n> And the OS?\nLinux')).toBe('> Which version?\n2.1\n> And the OS?\nLinux')
  })

  it('removes signatures', () => {
    expect(extractReplyText('Thanks\n\nSent from my iPhone')).toBe('Thanks')
    expect(extractReplyText('Thanks\n-- \nAda Lovelace\nAnalytical Engines')).toBe('Thanks')
  })

  it('falls back to the full text', () => {
    expect(extractReplyText('> only quoted')).toBe('> only quoted')
  })
})

describe('htmlToText', () => {
  it('keeps line breaks, drops tags, quotes and styles, decodes entities', () => {
    const html = '<html><head><style>p{}</style></head><body><p>Hello&nbsp;there &amp; thanks</p><div>Line&#33;<br>Next</div><blockquote>old</blockquote></body></html>'
    expect(htmlToText(html)).toBe('Hello there & thanks\nLine!\nNext')
  })
})

describe('verifySvixSignature', () => {
  const secret = `whsec_${Buffer.from('test-secret').toString('base64')}`
  const body = '{"type":"email.received"}'
  const now = 1_790_000_000_000
  const timestamp = String(now / 1000)
  const sign = (content: string) => createHmac('sha256', 'test-secret').update(content).digest('base64')

  it('accepts a valid signature among several', () => {
    const signature = `v1,invalid v1,${sign(`msg_1.${timestamp}.${body}`)}`
    expect(verifySvixSignature(secret, { id: 'msg_1', timestamp, signature }, body, now)).toBe(true)
  })

  it('rejects tampered bodies, old timestamps and missing headers', () => {
    const signature = `v1,${sign(`msg_1.${timestamp}.${body}`)}`
    expect(verifySvixSignature(secret, { id: 'msg_1', timestamp, signature }, `${body} `, now)).toBe(false)
    expect(verifySvixSignature(secret, { id: 'msg_1', timestamp, signature }, body, now + 10 * 60 * 1000)).toBe(false)
    expect(verifySvixSignature(secret, { id: undefined, timestamp, signature }, body, now)).toBe(false)
  })
})

describe('threadReplyEmail', () => {
  it('threads the email and escapes the body', () => {
    const email = threadReplyEmail({
      to: 'ada@example.com',
      from: '"Grace (Docs)" <support@example.com>',
      replyTo: 'reply+abc@in.example.com',
      subject: 'Question <b>',
      body: 'Use <code>npm ci</code>',
      authorName: 'Grace',
      siteName: 'Docs',
      inReplyTo: '<m1@mail.example.com>',
    })
    expect(email.subject).toBe('Re: Question <b>')
    expect(email.headers).toEqual({ 'In-Reply-To': '<m1@mail.example.com>', 'References': '<m1@mail.example.com>' })
    expect(email.text.startsWith(REPLY_MARKER)).toBe(true)
    expect(email.html).toContain('Use &lt;code&gt;npm ci&lt;/code&gt;')
    expect(email.html).not.toContain('<code>')
  })

  it('does not stack Re: prefixes', () => {
    expect(threadReplyEmail({ to: 'a@b.c', subject: 'Re: Hi', body: 'x', authorName: 'A', siteName: 'S' }).subject).toBe('Re: Hi')
  })
})

describe('dailyDigestEmail', () => {
  it('lists the waiting threads', () => {
    const email = dailyDigestEmail({
      to: 'owner@example.com',
      workspaceName: 'Acme',
      counts: { open: 2, pending: 1, newToday: 1 },
      threads: [{ subject: '<script>', contact: 'ada@example.com', waitingSince: '2026-10-27', url: 'https://app/t/1' }],
      inboxUrl: 'https://app/inbox',
    })
    expect(email.subject).toBe('[Acme] Inbox digest: 2 open')
    expect(email.text).toContain('2 open, 1 pending, 1 new in the last 24 hours')
    expect(email.html).toContain('&lt;script&gt;')
  })
})
