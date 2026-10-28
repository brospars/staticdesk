import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

import { visitorReplyEmail } from '../../emails/visitor-reply'
import { threadUrl } from './sender'

/** Emails the members who follow a thread about a visitor's reply, following their preferences. */
export async function notifyVisitorReply(event: H3Event, threadId: string, message: string) {
  const supabase = serverSupabaseServiceRole(event)
  const { data: thread } = await supabase
    .from('threads')
    .select('id, workspace_id, subject, contacts(email, name), sites(name)')
    .eq('id', threadId)
    .maybeSingle()
  if (!thread?.contacts || !thread.sites) return

  const { data: recipients, error } = await supabase
    .rpc('workspace_notification_emails', { ws: thread.workspace_id, kind: 'reply', thread: thread.id })
  if (error) {
    console.error('[inbox] could not list the members to notify', error.message)
    return
  }

  const mailer = useMailer()
  const results = await Promise.allSettled(recipients.map(to => mailer.send(visitorReplyEmail({
    to,
    siteName: thread.sites!.name,
    subject: thread.subject,
    contact: thread.contacts!,
    message,
    threadUrl: threadUrl(event, thread.id),
  }))))
  for (const result of results) {
    if (result.status === 'rejected') console.error('[inbox] notification email failed', result.reason)
  }
}
