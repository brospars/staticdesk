import type { H3Event } from 'h3'
import {
  isWithinOpeningHours,
  parseOpeningHours,
  planAutomation,
  type AutoReplyRule,
  type ContactSubmittedPayload,
} from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

import { autoReplyEmail, renderAutoReply } from '../../emails/auto-reply'

interface StoredRule extends AutoReplyRule {
  delayMinutes: number
}

/**
 * Runs the workspace's auto-reply rules on a new conversation: adds labels,
 * assigns it, and sends or schedules the auto-reply email. Never throws.
 */
export async function runAutomation(event: H3Event, workspaceId: string, payload: ContactSubmittedPayload) {
  try {
    const supabase = serverSupabaseServiceRole(event)
    const [rules, workspace] = await Promise.all([
      supabase
        .from('auto_replies')
        .select('id, site_id, trigger, conditions, send_email, add_labels, assignee_id, delay_minutes')
        .eq('workspace_id', workspaceId)
        .eq('enabled', true)
        .order('position')
        .order('created_at'),
      supabase.from('workspaces').select('opening_hours').eq('id', workspaceId).single(),
    ])
    if (rules.error) throw new Error(rules.error.message)
    if (!rules.data.length) return

    const plan = planAutomation<StoredRule>(
      rules.data.map(rule => ({
        id: rule.id,
        siteId: rule.site_id,
        trigger: rule.trigger,
        conditions: rule.conditions,
        sendEmail: rule.send_email,
        labels: rule.add_labels,
        assigneeId: rule.assignee_id,
        delayMinutes: rule.delay_minutes,
      })),
      { siteId: payload.site.id, widgetId: payload.widget?.id ?? null, message: payload.message, fields: payload.fields },
      { withinOpeningHours: isWithinOpeningHours(parseOpeningHours(workspace.data?.opening_hours)) },
    )

    if (plan.labels.length || plan.assigneeId) {
      const { data: thread } = await supabase.from('threads').select('labels, assignee_id').eq('id', payload.threadId).single()
      if (thread) {
        const { error } = await supabase
          .from('threads')
          .update({
            labels: [...new Set([...thread.labels, ...plan.labels])].slice(0, 20),
            ...(plan.assigneeId && !thread.assignee_id ? { assignee_id: plan.assigneeId } : {}),
          })
          .eq('id', payload.threadId)
        if (error) console.error('[automation] could not label or assign the conversation', error.message)
      }
    }

    if (plan.email) {
      const { error } = await supabase.from('auto_reply_deliveries').insert({
        workspace_id: workspaceId,
        thread_id: payload.threadId,
        auto_reply_id: plan.email.id,
        send_at: new Date(Date.now() + plan.email.delayMinutes * 60_000).toISOString(),
      })
      if (error) throw new Error(error.message)
      if (!plan.email.delayMinutes) await sendDueAutoReplies(event, { thread: payload.threadId })
    }
  }
  catch (cause) {
    console.error('[automation] auto-replies failed', cause)
  }
}

type DeliveryOutcome = { status: 'sent', messageId: string } | { status: 'skipped' | 'failed', reason: string }

export interface DeliveryCounts {
  sent: number
  skipped: number
  failed: number
}

/**
 * Sends the auto-replies that are due (all of them, or the one of a thread).
 * Each delivery is claimed first, so concurrent runs never send twice.
 */
export async function sendDueAutoReplies(event: H3Event, options: { thread?: string, max?: number } = {}): Promise<DeliveryCounts> {
  const supabase = serverSupabaseServiceRole(event)
  const { data: deliveries, error } = await supabase.rpc('claim_auto_reply_deliveries', {
    max_count: options.max ?? 50,
    thread: options.thread,
  })
  if (error) throw new Error(`Could not claim auto-replies: ${error.message}`)

  const counts: DeliveryCounts = { sent: 0, skipped: 0, failed: 0 }
  for (const delivery of deliveries) {
    let outcome: DeliveryOutcome
    try {
      outcome = await deliver(event, delivery)
    }
    catch (cause) {
      console.error('[automation] auto-reply failed', cause)
      outcome = { status: 'failed', reason: 'Unexpected error' }
    }
    counts[outcome.status]++
    await supabase
      .from('auto_reply_deliveries')
      .update(outcome.status === 'sent'
        ? { status: 'sent', message_id: outcome.messageId, reason: null }
        : { status: outcome.status, reason: outcome.reason.slice(0, 500) })
      .eq('id', delivery.id)
  }
  return counts
}

async function deliver(event: H3Event, delivery: { thread_id: string, auto_reply_id: string, workspace_id: string }): Promise<DeliveryOutcome> {
  const supabase = serverSupabaseServiceRole(event)
  const [{ data: thread }, { data: rule }, { data: answered }] = await Promise.all([
    supabase
      .from('threads')
      .select('id, contacts(email, name, email_suppressed_at), sites(name)')
      .eq('id', delivery.thread_id)
      .single(),
    supabase
      .from('auto_replies')
      .select('id, name, enabled, send_email, subject, body')
      .eq('id', delivery.auto_reply_id)
      .single(),
    supabase
      .from('messages')
      .select('id')
      .eq('thread_id', delivery.thread_id)
      .eq('direction', 'outbound')
      .limit(1),
  ])

  if (!thread?.contacts || !thread.sites) return { status: 'skipped', reason: 'The conversation was deleted' }
  if (!rule?.enabled || !rule.send_email || !rule.subject || !rule.body) return { status: 'skipped', reason: 'The rule was turned off' }
  if (thread.contacts.email_suppressed_at) return { status: 'skipped', reason: 'Emails to this address are suppressed' }
  if (answered?.length) return { status: 'skipped', reason: 'The team answered first' }

  const template = {
    subject: rule.subject,
    body: rule.body,
    variables: { name: thread.contacts.name, email: thread.contacts.email, site: thread.sites.name },
  }
  const email = autoReplyEmail({
    ...template,
    to: thread.contacts.email,
    ...await automaticSender(event, { workspaceId: delivery.workspace_id, threadId: thread.id, siteName: thread.sites.name }),
    siteName: thread.sites.name,
  })

  const metadata = { autoReply: { id: rule.id, name: rule.name } }
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      workspace_id: delivery.workspace_id,
      thread_id: thread.id,
      direction: 'outbound',
      body: renderAutoReply(template).text.trim() || rule.body,
      metadata,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Could not store the auto-reply: ${error.message}`)

  try {
    const sent = await useMailer().send(email)
    if (sent.id) await supabase.from('messages').update({ metadata: { ...metadata, emailId: sent.id } }).eq('id', message.id)
  }
  catch (cause) {
    await supabase.from('messages').delete().eq('id', message.id)
    return { status: 'failed', reason: cause instanceof Error ? cause.message : 'The email could not be sent' }
  }
  return { status: 'sent', messageId: message.id }
}
