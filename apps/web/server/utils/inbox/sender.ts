import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

import { formatAddress, parseAddress, replyAddress } from './addresses'

export interface ReplySender {
  from: string
  replyTo: string | undefined
}

/**
 * Address the workspace sends from: its verified domain when it has one, else
 * NUXT_MAIL_FROM.
 */
async function senderAddress(event: H3Event, workspaceId: string): Promise<string> {
  const { mail } = useRuntimeConfig(event)
  const { data: domain } = await serverSupabaseServiceRole(event)
    .from('sending_domains')
    .select('domain, from_local_part, status')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  return domain?.status === 'verified'
    ? `${domain.from_local_part}@${domain.domain}`
    : parseAddress(mail.from).email
}

/** Address visitor replies come back to, when inbound email is configured. */
function inboundReplyTo(event: H3Event, threadId: string): string | undefined {
  const { mail } = useRuntimeConfig(event)
  return mail.inboundDomain && mail.replySecret
    ? replyAddress(mail.replySecret, threadId, mail.inboundDomain)
    : undefined
}

/**
 * From and Reply-To of a reply to a visitor. Sends from the workspace's
 * verified domain when it has one, else from NUXT_MAIL_FROM. Replies come back
 * to the inbound address when inbound email is configured, else to the author.
 */
export async function replySender(event: H3Event, options: {
  workspaceId: string
  threadId: string
  authorName: string
  authorEmail: string | undefined
  siteName: string
}): Promise<ReplySender> {
  const address = await senderAddress(event, options.workspaceId)
  return {
    from: formatAddress(`${options.authorName} (${options.siteName})`, address),
    replyTo: inboundReplyTo(event, options.threadId) ?? options.authorEmail,
  }
}

/**
 * From and Reply-To of an automatic email, sent in the site's name. Without
 * inbound email, visitor replies go to the sender address.
 */
export async function automaticSender(event: H3Event, options: {
  workspaceId: string
  threadId: string
  siteName: string
}): Promise<ReplySender> {
  const address = await senderAddress(event, options.workspaceId)
  return {
    from: formatAddress(options.siteName, address),
    replyTo: inboundReplyTo(event, options.threadId),
  }
}

/** Link to a conversation in the dashboard. */
export function threadUrl(event: H3Event, threadId: string) {
  return `${appUrl(event)}/app/inbox/${threadId}`
}
