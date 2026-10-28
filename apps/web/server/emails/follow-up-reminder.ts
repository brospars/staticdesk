import type { MailMessage } from '../utils/mailer'
import { escapeHtml } from './escape'

export interface FollowUpReminderEmailOptions {
  to: string
  workspaceName: string
  subject: string | null
  contact: string
  hours: number
  threadUrl: string
}

/** Reminds the team of a conversation that has been waiting for an answer. */
export function followUpReminderEmail(options: FollowUpReminderEmailOptions): MailMessage {
  const subject = options.subject || '(no subject)'
  const waiting = options.hours === 1 ? '1 hour' : `${options.hours} hours`
  return {
    to: options.to,
    subject: `[${options.workspaceName}] Waiting for an answer: ${subject}`,
    text: [
      `${options.contact} has been waiting for an answer for more than ${waiting}.`,
      '',
      subject,
      '',
      `Answer in StaticDesk: ${options.threadUrl}`,
    ].join('\n'),
    html: `<p style="font-size:15px">${escapeHtml(options.contact)} has been waiting for an answer for more than ${waiting}.</p>
<p style="font-size:15px"><strong>${escapeHtml(subject)}</strong></p>
<p><a href="${escapeHtml(options.threadUrl)}">Answer in StaticDesk</a></p>
<p style="color:#6b7280;font-size:13px">You receive these reminders for the ${escapeHtml(options.workspaceName)} workspace. Change the delay in Settings, Auto-replies.</p>`,
  }
}
