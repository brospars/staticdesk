import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const paramsSchema = z.object({ id: z.guid() })

// Removes the workspace's sending domain; replies go out from the default address again.
export default defineEventHandler(async (event) => {
  const { id: workspaceId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireWorkspaceRole(event, workspaceId, ['owner', 'admin'])
  const supabase = serverSupabaseServiceRole(event)

  const { data: current } = await supabase
    .from('sending_domains')
    .select('provider_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!current) throw createError({ statusCode: 404, statusMessage: 'No sending domain' })

  const resend = useResend()
  if (current.provider_id && resend) {
    const { error } = await resend.domains.remove(current.provider_id)
    if (error && error.name !== 'not_found') throw createError({ statusCode: 502, statusMessage: error.message })
  }
  await supabase.from('sending_domains').delete().eq('workspace_id', workspaceId)

  setResponseStatus(event, 204)
  return null
})
