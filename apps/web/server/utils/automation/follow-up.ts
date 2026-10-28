import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

import { followUpReminderEmail } from '../../emails/follow-up-reminder'

/**
 * Emails members about open conversations left unanswered longer than their
 * workspace's follow_up_hours, once per visitor message. Recipients follow the
 * reply notification preferences (assignee, or everyone for unassigned threads).
 */
export async function sendFollowUpReminders(event: H3Event): Promise<{ threads: number, sent: number }> {
  const supabase = serverSupabaseServiceRole(event)
  const { data: due, error } = await supabase.rpc('claim_follow_up_reminders', { max_count: 100 })
  if (error) throw new Error(`Could not list conversations to follow up: ${error.message}`)
  if (!due.length) return { threads: 0, sent: 0 }

  const [{ data: workspaces }, { data: threads }] = await Promise.all([
    supabase.from('workspaces').select('id, name').in('id', [...new Set(due.map(row => row.workspace_id))]),
    supabase.from('threads').select('id, contacts(email, name)').in('id', due.map(row => row.thread_id)),
  ])
  const workspaceName = new Map(workspaces?.map(workspace => [workspace.id, workspace.name]))
  const contactOf = new Map(threads?.map(thread => [thread.id, thread.contacts?.name || thread.contacts?.email || 'A visitor']))

  const mailer = useMailer()
  let sent = 0
  for (const thread of due) {
    const { data: recipients, error } = await supabase
      .rpc('workspace_notification_emails', { ws: thread.workspace_id, kind: 'reply', thread: thread.thread_id })
    if (error) {
      console.error('[follow-up] could not list the members to remind', error.message)
      continue
    }
    const results = await Promise.allSettled(recipients.map(to => mailer.send(followUpReminderEmail({
      to,
      workspaceName: workspaceName.get(thread.workspace_id) ?? 'StaticDesk',
      subject: thread.subject,
      contact: contactOf.get(thread.thread_id) ?? 'A visitor',
      hours: thread.follow_up_hours,
      threadUrl: threadUrl(event, thread.thread_id),
    }))))
    for (const result of results) {
      if (result.status === 'fulfilled') sent++
      else console.error('[follow-up] reminder email failed', result.reason)
    }
  }
  return { threads: due.length, sent }
}
