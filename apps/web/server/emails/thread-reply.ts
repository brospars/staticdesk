import type { MailMessage } from '../utils/mailer'
import { REPLY_MARKER } from '../utils/inbox/reply-text'
import { escapeHtml } from './escape'

export interface ThreadReplyEmailOptions {
  to: string
  from?: string
  replyTo?: string
  subject: string
  body: string
  authorName: string
  siteName: string
  /** Message-ID of the visitor's last email, to keep the conversation threaded. */
  inReplyTo?: string | null
}

/** A team member's answer, sent to the visitor. Replying to it adds to the thread. */
export function threadReplyEmail(options: ThreadReplyEmailOptions): MailMessage {
  const subject = /^re:/i.test(options.subject) ? options.subject : `Re: ${options.subject}`
  const headers: Record<string, string> = {}
  if (options.inReplyTo) {
    headers['In-Reply-To'] = options.inReplyTo
    headers.References = options.inReplyTo
  }

  return {
    to: options.to,
    from: options.from,
    replyTo: options.replyTo,
    subject,
    headers,
    text: [
      REPLY_MARKER,
      '',
      options.body,
      '',
      '--',
      `${options.authorName}, ${options.siteName}`,
    ].join('\n'),
    html: `<div style="color:#9ca3af;font-size:12px">${escapeHtml(REPLY_MARKER)}</div>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.5;margin:16px 0">${escapeHtml(options.body)}</div>
<p style="color:#6b7280;font-size:13px">${escapeHtml(options.authorName)}, ${escapeHtml(options.siteName)}</p>`,
  }
}
