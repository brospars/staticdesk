import { fillTemplate, renderMarkdown } from '@staticdesk/core'

import type { MailMessage } from '../utils/mailer'
import { REPLY_MARKER } from '../utils/inbox/reply-text'
import { escapeHtml } from './escape'

export interface AutoReplyEmailOptions {
  to: string
  from?: string
  replyTo?: string
  /** Templates written in the dashboard, with {{name}} style variables. */
  subject: string
  body: string
  variables: Record<string, string | null | undefined>
  siteName: string
}

/** Subject and body of an auto-reply with its variables filled in. Also used for previews. */
export function renderAutoReply(options: Pick<AutoReplyEmailOptions, 'subject' | 'body' | 'variables'>) {
  const fill = (template: string) => fillTemplate(template, options.variables)
  return {
    subject: fill(options.subject).replace(/[\r\n]+/g, ' ').trim().slice(0, 300),
    text: fill(options.body),
    // Variables are inserted as text: a visitor's name cannot add links or markup.
    html: renderMarkdown(options.body, { variable: fill }),
  }
}

/**
 * Automatic answer to a new conversation (acknowledgement or out-of-office).
 * Flagged as auto-replied (RFC 3834) so other auto-responders stay quiet.
 */
export function autoReplyEmail(options: AutoReplyEmailOptions): MailMessage {
  const { subject, text, html } = renderAutoReply(options)
  return {
    to: options.to,
    from: options.from,
    replyTo: options.replyTo,
    subject,
    headers: {
      'Auto-Submitted': 'auto-replied',
      'X-Auto-Response-Suppress': 'All',
    },
    text: [REPLY_MARKER, '', text, '', '--', options.siteName].join('\n'),
    html: `<div style="color:#9ca3af;font-size:12px">${escapeHtml(REPLY_MARKER)}</div>
<div style="font-size:15px;line-height:1.5;margin:16px 0">${html}</div>
<p style="color:#6b7280;font-size:13px">${escapeHtml(options.siteName)}</p>`,
  }
}
