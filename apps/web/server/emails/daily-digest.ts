import type { MailMessage } from '../utils/mailer'
import { escapeHtml } from './escape'

export interface DigestThread {
  subject: string | null
  contact: string
  waitingSince: string
  url: string
}

export interface DailyDigestEmailOptions {
  to: string
  workspaceName: string
  counts: { open: number, pending: number, newToday: number }
  threads: DigestThread[]
  inboxUrl: string
}

/** Morning summary of a workspace inbox. */
export function dailyDigestEmail(options: DailyDigestEmailOptions): MailMessage {
  const { open, pending, newToday } = options.counts
  const summary = `${open} open, ${pending} pending, ${newToday} new in the last 24 hours`
  const title = (thread: DigestThread) => thread.subject || '(no subject)'

  return {
    to: options.to,
    subject: `[${options.workspaceName}] Inbox digest: ${open} open`,
    text: [
      `${options.workspaceName}: ${summary}.`,
      '',
      ...(options.threads.length ? ['Waiting the longest:', ...options.threads.map(thread => `- ${title(thread)} (${thread.contact}, since ${thread.waitingSince}): ${thread.url}`), ''] : []),
      `Open the inbox: ${options.inboxUrl}`,
      '',
      'Turn off the digest in StaticDesk, under Settings > Notifications.',
    ].join('\n'),
    html: `<p style="font-size:15px"><strong>${escapeHtml(options.workspaceName)}</strong>: ${escapeHtml(summary)}.</p>
${options.threads.length
  ? `<p style="color:#6b7280;font-size:13px;margin-bottom:4px">Waiting the longest:</p>
<ul style="font-size:14px;line-height:1.6;padding-left:20px;margin-top:0">
${options.threads.map(thread => `<li><a href="${escapeHtml(thread.url)}">${escapeHtml(title(thread))}</a> <span style="color:#6b7280">${escapeHtml(thread.contact)}, since ${escapeHtml(thread.waitingSince)}</span></li>`).join('\n')}
</ul>`
  : ''}
<p><a href="${escapeHtml(options.inboxUrl)}">Open the inbox</a></p>
<p style="color:#9ca3af;font-size:12px">Turn off the digest in StaticDesk, under Settings &gt; Notifications.</p>`,
  }
}
