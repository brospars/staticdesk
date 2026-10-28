import { z } from 'zod'
import { threadReplySchema } from '@staticdesk/core'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

import { threadReplyEmail } from '../../../emails/thread-reply'

const paramsSchema = z.object({ id: z.guid() })

// Answers a visitor by email from the dashboard. RLS restricts threads to workspace members;
// the message is stored with the service role since members only insert notes directly.
export default defineEventHandler(async (event): Promise<{ id: string }> => {
  const user = await requireUser(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { body, status } = await readValidatedBody(event, threadReplySchema.parse)
  const supabase = await serverSupabaseClient(event)

  const { data: thread } = await supabase
    .from('threads')
    .select('id, workspace_id, subject, contacts(email, name, email_suppressed_at), sites(name)')
    .eq('id', id)
    .maybeSingle()
  if (!thread?.contacts || !thread.sites) throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  if (thread.contacts.email_suppressed_at) {
    throw createError({ statusCode: 409, statusMessage: 'This address bounced or reported spam: emails to it are suppressed' })
  }

  await enforceRateLimit(event, `reply:${user.sub}`, 60, 30)

  const admin = serverSupabaseServiceRole(event)
  const { data: lastEmail } = await admin
    .from('messages')
    .select('email_message_id')
    .eq('thread_id', thread.id)
    .eq('direction', 'inbound')
    .not('email_message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: message, error } = await admin
    .from('messages')
    .insert({ workspace_id: thread.workspace_id, thread_id: thread.id, direction: 'outbound', author_id: user.sub, body })
    .select('id')
    .single()
  if (error) {
    console.error('[inbox] could not store the reply', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not send the reply' })
  }

  const authorName = userDisplayName(user)
  try {
    const sender = await replySender(event, {
      workspaceId: thread.workspace_id,
      threadId: thread.id,
      authorName,
      authorEmail: user.email,
      siteName: thread.sites.name,
    })
    const sent = await useMailer().send(threadReplyEmail({
      to: thread.contacts.email,
      ...sender,
      subject: thread.subject || `Your message to ${thread.sites.name}`,
      body,
      authorName,
      siteName: thread.sites.name,
      inReplyTo: lastEmail?.email_message_id,
    }))
    if (sent.id) await admin.from('messages').update({ metadata: { emailId: sent.id } }).eq('id', message.id)
  }
  catch (cause) {
    await admin.from('messages').delete().eq('id', message.id)
    console.error('[inbox] reply email failed', cause)
    throw createError({ statusCode: 502, statusMessage: 'Could not send the reply email' })
  }

  if (status) await supabase.from('threads').update({ status }).eq('id', thread.id)

  setResponseStatus(event, 201)
  return { id: message.id }
})
