import { serverSupabaseServiceRole } from '#supabase/server'

import { dailyDigestEmail } from '../../emails/daily-digest'

const DAY_MS = 24 * 60 * 60 * 1000

// Daily inbox digest for members who opted in. Called by Vercel Cron (or any scheduler).
export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const supabase = serverSupabaseServiceRole(event)
  const { data: subscribed, error } = await supabase
    .from('notification_preferences')
    .select('workspace_id')
    .eq('daily_digest', true)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const workspaceIds = [...new Set(subscribed.map(row => row.workspace_id))]
  const { data: workspaces } = workspaceIds.length
    ? await supabase.from('workspaces').select('id, name').in('id', workspaceIds)
    : { data: [] }

  const since = new Date(Date.now() - DAY_MS).toISOString()
  const mailer = useMailer()
  let sent = 0

  for (const workspace of workspaces ?? []) {
    const threads = () => supabase.from('threads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id)
    const [open, pending, newToday, oldest, recipients] = await Promise.all([
      threads().eq('status', 'open'),
      threads().eq('status', 'pending'),
      threads().gte('created_at', since),
      supabase
        .from('threads')
        .select('id, subject, last_message_at, contacts(email, name)')
        .eq('workspace_id', workspace.id)
        .eq('status', 'open')
        .order('last_message_at')
        .limit(10),
      supabase.rpc('workspace_notification_emails', { ws: workspace.id, kind: 'digest' }),
    ])
    const counts = { open: open.count ?? 0, pending: pending.count ?? 0, newToday: newToday.count ?? 0 }
    // Nothing waiting: no email.
    if (!counts.open && !counts.pending) continue

    const waiting = (oldest.data ?? []).map(thread => ({
      subject: thread.subject,
      contact: thread.contacts?.name || thread.contacts?.email || 'Unknown',
      waitingSince: new Date(thread.last_message_at).toISOString().slice(0, 10),
      url: threadUrl(event, thread.id),
    }))

    const results = await Promise.allSettled((recipients.data ?? []).map(to => mailer.send(dailyDigestEmail({
      to,
      workspaceName: workspace.name,
      counts,
      threads: waiting,
      inboxUrl: `${appUrl(event)}/app/inbox`,
    }))))
    for (const result of results) {
      if (result.status === 'fulfilled') sent++
      else console.error('[digest] email failed', result.reason)
    }
  }

  return { workspaces: workspaces?.length ?? 0, sent }
})
