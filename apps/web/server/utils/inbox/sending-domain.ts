import type { H3Event } from 'h3'

// A type alias rather than an interface, so it is assignable to Json columns.
export type DnsRecord = {
  record: string
  type: string
  name: string
  value: string
  ttl: string
  status: string
  priority?: number
}

/** DNS records to show in the dashboard, from a Resend domain. */
export function dnsRecords(records: DnsRecord[]): DnsRecord[] {
  return records.map(({ record, type, name, value, ttl, status, priority }) => ({
    record, type, name, value, ttl, status, ...(priority === undefined ? {} : { priority }),
  }))
}

/** Owner or admin of a workspace allowed to use a custom sending domain, and the Resend client. */
export async function requireSendingDomainAccess(event: H3Event, workspaceId: string) {
  const { workspace } = await requireWorkspaceRole(event, workspaceId, ['owner', 'admin'])

  const { public: { edition } } = useRuntimeConfig(event)
  if (edition === 'saas' && workspace.plan !== 'team') {
    throw createError({ statusCode: 402, statusMessage: 'Custom sending domains are part of the Team plan' })
  }

  const resend = useResend()
  if (!resend) throw createError({ statusCode: 400, statusMessage: 'Custom sending domains need NUXT_MAIL_DRIVER=resend' })
  return { workspace, resend }
}
