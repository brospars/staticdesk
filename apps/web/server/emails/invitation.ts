import type { MailMessage } from '../utils/mailer'
import { escapeHtml } from './escape'

export function invitationEmail(options: {
  to: string
  workspaceName: string
  inviterEmail: string
  acceptUrl: string
}): MailMessage {
  const workspace = escapeHtml(options.workspaceName)
  const inviter = escapeHtml(options.inviterEmail)
  const url = escapeHtml(options.acceptUrl)

  return {
    to: options.to,
    subject: `Join ${options.workspaceName} on StaticDesk`,
    text: [
      `${options.inviterEmail} invited you to join ${options.workspaceName} on StaticDesk.`,
      '',
      `Accept the invitation: ${options.acceptUrl}`,
      '',
      'This link expires in 7 days. If you did not expect this email, you can ignore it.',
    ].join('\n'),
    html: `<p>${inviter} invited you to join <strong>${workspace}</strong> on StaticDesk.</p>
<p><a href="${url}">Accept the invitation</a></p>
<p style="color:#6b7280;font-size:13px">This link expires in 7 days. If you did not expect this email, you can ignore it.</p>`,
  }
}
