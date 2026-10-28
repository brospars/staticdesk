import { z } from 'zod'
import { sendingDomainSchema } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

const paramsSchema = z.object({ id: z.guid() })

// Adds a custom sending domain to a workspace (owners and admins) and returns the DNS records to set.
export default defineEventHandler(async (event) => {
  const { id: workspaceId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { domain, fromLocalPart } = await readValidatedBody(event, sendingDomainSchema.parse)
  const { resend } = await requireSendingDomainAccess(event, workspaceId)
  const supabase = serverSupabaseServiceRole(event)

  const { data: existing } = await supabase.from('sending_domains').select('domain').eq('workspace_id', workspaceId).maybeSingle()
  if (existing) throw createError({ statusCode: 409, statusMessage: `Remove ${existing.domain} before adding another domain` })

  const { data: created, error: resendError } = await resend.domains.create({ name: domain })
  if (resendError || !created) {
    throw createError({ statusCode: 422, statusMessage: resendError?.message ?? 'Could not add the domain' })
  }

  const { data, error } = await supabase
    .from('sending_domains')
    .insert({
      workspace_id: workspaceId,
      domain,
      from_local_part: fromLocalPart,
      provider_id: created.id,
      status: created.status,
      records: dnsRecords(created.records),
    })
    .select('domain, from_local_part, status, records, verified_at')
    .single()
  if (error) {
    await resend.domains.remove(created.id)
    throw createError({ statusCode: 500, statusMessage: 'Could not save the domain' })
  }

  setResponseStatus(event, 201)
  return data
})
