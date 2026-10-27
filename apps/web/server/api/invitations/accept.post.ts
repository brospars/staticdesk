import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({ token: z.string().min(20).max(200) })

// Adds the signed-in user to the workspace of a pending invitation sent to their email.
export default defineEventHandler(async (event): Promise<{ workspaceId: string }> => {
  const user = await requireUser(event)
  const { token } = await readValidatedBody(event, bodySchema.parse)
  // The invitee is not a member yet, so RLS would hide the invitation.
  const admin = serverSupabaseServiceRole(event)

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, workspace_id, email, role, expires_at, accepted_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!invitation || invitation.accepted_at) {
    throw createError({ statusCode: 404, statusMessage: 'This invitation is invalid or was already used' })
  }
  if (new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })
  }
  if (invitation.email.toLowerCase() !== String(user.email ?? '').toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'This invitation was sent to another email address' })
  }

  const { error } = await admin
    .from('members')
    .upsert(
      { workspace_id: invitation.workspace_id, user_id: user.sub, role: invitation.role },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true },
    )
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not join the workspace' })

  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { workspaceId: invitation.workspace_id }
})
