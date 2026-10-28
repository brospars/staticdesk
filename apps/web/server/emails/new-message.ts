import type { ContactFieldEntry } from '@staticdesk/core'

import type { MailMessage } from '../utils/mailer'
import { escapeHtml } from './escape'

export interface NewMessageEmailOptions {
  to: string
  siteName: string
  contact: { email: string, name: string | null }
  message: string
  fields: ContactFieldEntry[]
  pageUrl: string | null
  dashboardUrl: string
}

/** Tells a team member about a new contact message. Replying goes straight to the visitor. */
export function newMessageEmail(options: NewMessageEmailOptions): MailMessage {
  const from = options.contact.name ? `${options.contact.name} <${options.contact.email}>` : options.contact.email
  const subjectLine = options.message.split('\n')[0]!.slice(0, 80)
  const details = [
    { label: 'From', value: from },
    ...options.fields.map(({ label, value }) => ({ label, value })),
    ...(options.pageUrl ? [{ label: 'Page', value: options.pageUrl }] : []),
  ]

  return {
    to: options.to,
    replyTo: options.contact.email,
    subject: `[${options.siteName}] ${subjectLine}`,
    text: [
      `New message on ${options.siteName}`,
      '',
      ...details.map(({ label, value }) => `${label}: ${value}`),
      '',
      options.message,
      '',
      '---',
      `Reply to this email to answer ${options.contact.email}, or open StaticDesk: ${options.dashboardUrl}`,
    ].join('\n'),
    html: `<p style="color:#6b7280;font-size:13px">New message on <strong>${escapeHtml(options.siteName)}</strong></p>
<table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
${details.map(({ label, value }) => `<tr><td style="padding:2px 12px 2px 0;color:#6b7280;vertical-align:top">${escapeHtml(label)}</td><td style="padding:2px 0">${escapeHtml(value)}</td></tr>`).join('\n')}
</table>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.5">${escapeHtml(options.message)}</div>
<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0 12px">
<p style="color:#6b7280;font-size:13px">Reply to this email to answer ${escapeHtml(options.contact.email)}, or <a href="${escapeHtml(options.dashboardUrl)}">open StaticDesk</a>.</p>`,
  }
}
