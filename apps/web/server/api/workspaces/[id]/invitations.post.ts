import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

import { invitationEmail } from '../../../emails/invitation'

const paramsSchema = z.object({ id: z.uuid() })
const bodySchema = z.object({
  email: z.email().trim().toLowerCase().max(320),
  role: z.enum(['admin', 'member']).default('member'),
})

// Invites someone to a workspace by email. RLS restricts this to owners and admins.
export default defineEventHandler(async (event): Promise<{ id: string }> => {
  const user = await requireUser(event)
  const { id: workspaceId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { email, role } = await readValidatedBody(event, bodySchema.parse)
  const supabase = await serverSupabaseClient(event)

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!workspace) throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })

  // Expired invitations no longer block a new one.
  await supabase
    .from('invitations')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .is('accepted_at', null)
    .lt('expires_at', new Date().toISOString())

  const token = generateToken()
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({ workspace_id: workspaceId, email, role, token_hash: hashToken(token), invited_by: user.sub })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'This person already has a pending invitation' })
    if (error.code === '42501') throw createError({ statusCode: 403, statusMessage: 'Only owners and admins can invite members' })
    throw createError({ statusCode: 500, statusMessage: 'Could not create the invitation' })
  }

  try {
    await useMailer().send(invitationEmail({
      to: email,
      workspaceName: workspace.name,
      inviterEmail: String(user.email ?? 'A teammate'),
      acceptUrl: `${appUrl(event)}/invite/${token}`,
    }))
  }
  catch (cause) {
    await supabase.from('invitations').delete().eq('id', invitation.id)
    console.error('[invitations] email failed', cause)
    throw createError({ statusCode: 502, statusMessage: 'Could not send the invitation email' })
  }

  setResponseStatus(event, 201)
  return { id: invitation.id }
})
