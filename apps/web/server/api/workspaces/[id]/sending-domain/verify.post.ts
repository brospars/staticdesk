import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const paramsSchema = z.object({ id: z.guid() })

// Asks Resend to check the DNS records of the workspace's sending domain, then stores the result.
export default defineEventHandler(async (event) => {
  const { id: workspaceId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { resend } = await requireSendingDomainAccess(event, workspaceId)
  const supabase = serverSupabaseServiceRole(event)

  const { data: current } = await supabase
    .from('sending_domains')
    .select('provider_id, verified_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!current?.provider_id) throw createError({ statusCode: 404, statusMessage: 'No sending domain' })

  await enforceRateLimit(event, `domain-verify:${workspaceId}`, 60, 5)
  await resend.domains.verify(current.provider_id)
  const { data: domain, error: resendError } = await resend.domains.get(current.provider_id)
  if (resendError || !domain) throw createError({ statusCode: 502, statusMessage: resendError?.message ?? 'Could not check the domain' })

  const verified = domain.status === 'verified'
  const { data, error } = await supabase
    .from('sending_domains')
    .update({
      status: domain.status,
      records: dnsRecords(domain.records),
      verified_at: verified ? current.verified_at ?? new Date().toISOString() : null,
    })
    .eq('workspace_id', workspaceId)
    .select('domain, from_local_part, status, records, verified_at')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not save the domain status' })
  return data
})
