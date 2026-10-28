import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

import { formatAddress, parseAddress, replyAddress } from './addresses'

export interface ReplySender {
  from: string
  replyTo: string | undefined
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
  const { mail } = useRuntimeConfig(event)
  const { data: domain } = await serverSupabaseServiceRole(event)
    .from('sending_domains')
    .select('domain, from_local_part, status')
    .eq('workspace_id', options.workspaceId)
    .maybeSingle()

  const address = domain?.status === 'verified'
    ? `${domain.from_local_part}@${domain.domain}`
    : parseAddress(mail.from).email
  const from = formatAddress(`${options.authorName} (${options.siteName})`, address)

  const replyTo = mail.inboundDomain && mail.replySecret
    ? replyAddress(mail.replySecret, options.threadId, mail.inboundDomain)
    : options.authorEmail
  return { from, replyTo }
}

/** Link to a conversation in the dashboard. */
export function threadUrl(event: H3Event, threadId: string) {
  return `${appUrl(event)}/app/inbox/${threadId}`
}
