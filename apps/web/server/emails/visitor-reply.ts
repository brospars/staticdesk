import type { MailMessage } from '../utils/mailer'
import { escapeHtml } from './escape'

export interface VisitorReplyEmailOptions {
  to: string
  siteName: string
  subject: string | null
  contact: { email: string, name: string | null }
  message: string
  threadUrl: string
}

/** Tells a team member that a visitor answered in a conversation. */
export function visitorReplyEmail(options: VisitorReplyEmailOptions): MailMessage {
  const from = options.contact.name ? `${options.contact.name} <${options.contact.email}>` : options.contact.email
  const subject = options.subject ? `Re: ${options.subject}` : 'New reply'

  return {
    to: options.to,
    subject: `[${options.siteName}] ${subject}`,
    text: [
      `${from} replied on ${options.siteName}:`,
      '',
      options.message,
      '',
      '---',
      `Answer in StaticDesk: ${options.threadUrl}`,
    ].join('\n'),
    html: `<p style="color:#6b7280;font-size:13px"><strong>${escapeHtml(from)}</strong> replied on ${escapeHtml(options.siteName)}:</p>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.5">${escapeHtml(options.message)}</div>
<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0 12px">
<p style="color:#6b7280;font-size:13px"><a href="${escapeHtml(options.threadUrl)}">Answer in StaticDesk</a></p>`,
  }
}
