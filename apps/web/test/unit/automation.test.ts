import { describe, expect, it } from 'vitest'

import { autoReplyEmail, renderAutoReply } from '../../server/emails/auto-reply'
import { followUpReminderEmail } from '../../server/emails/follow-up-reminder'
import { REPLY_MARKER } from '../../server/utils/inbox/reply-text'

describe('autoReplyEmail', () => {
  const options = {
    to: 'ada@example.com',
    from: '"Docs" <support@example.com>',
    replyTo: 'reply+abc.def@in.staticdesk.app',
    subject: 'We received your message, {{name|there}}',
    body: 'Hi **{{name|there}}**,\n\nThanks for writing to {{site}}. See [the FAQ](https://example.com/faq).',
    variables: { name: 'Ada', email: 'ada@example.com', site: 'Docs' },
    siteName: 'Docs',
  }

  it('fills the variables and renders the Markdown', () => {
    const email = autoReplyEmail(options)
    expect(email.subject).toBe('We received your message, Ada')
    expect(email.text).toContain('Hi **Ada**,\n\nThanks for writing to Docs.')
    expect(email.text.startsWith(REPLY_MARKER)).toBe(true)
    expect(email.html).toContain('<p>Hi <strong>Ada</strong>,</p>')
    expect(email.html).toContain('<a href="https://example.com/faq">the FAQ</a>')
    expect(email.replyTo).toBe(options.replyTo)
  })

  it('is flagged as an automatic reply', () => {
    expect(autoReplyEmail(options).headers).toEqual({ 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' })
  })

  it('never renders visitor input as markup', () => {
    const rendered = renderAutoReply({
      ...options,
      variables: { name: '[Claim your prize](https://evil.example)\r\nBcc: x <b>', site: 'Docs' },
    })
    expect(rendered.html).not.toContain('<a href="https://evil.example"')
    expect(rendered.html).toContain('&lt;b&gt;')
    expect(rendered.subject).not.toMatch(/[\r\n]/)
  })

  it('falls back when the name is unknown', () => {
    expect(renderAutoReply({ ...options, variables: { name: null, site: 'Docs' } }).subject).toBe('We received your message, there')
  })
})

describe('followUpReminderEmail', () => {
  it('links to the conversation and escapes its subject', () => {
    const email = followUpReminderEmail({
      to: 'team@example.com',
      workspaceName: 'Demo',
      subject: 'Refund <please>',
      contact: 'Ada',
      hours: 24,
      threadUrl: 'https://staticdesk.app/app/inbox/1',
    })
    expect(email.subject).toBe('[Demo] Waiting for an answer: Refund <please>')
    expect(email.text).toContain('more than 24 hours')
    expect(email.html).toContain('Refund &lt;please&gt;')
    expect(email.html).toContain('href="https://staticdesk.app/app/inbox/1"')
  })
})
