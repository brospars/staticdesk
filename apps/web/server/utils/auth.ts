import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/** Returns the signed-in user or throws 401. */
export async function requireUser(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return user
}

/** Public base URL used in emailed links. */
export function appUrl(event: H3Event) {
  const configured = String(useRuntimeConfig(event).public.appUrl)
  return (configured || getRequestURL(event).origin).replace(/\/$/, '')
}

type MemberRole = 'owner' | 'admin' | 'member'

/**
 * Checks that the signed-in user belongs to the workspace with one of the
 * roles (through RLS) and returns the workspace. Throws 404 or 403.
 */
export async function requireWorkspaceRole(event: H3Event, workspaceId: string, roles: MemberRole[] = ['owner', 'admin', 'member']) {
  const user = await requireUser(event)
  const supabase = await serverSupabaseClient(event)
  const { data: membership } = await supabase
    .from('members')
    .select('role, workspace:workspaces!inner(id, name, plan)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.sub)
    .maybeSingle()
  if (!membership) throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })
  if (!roles.includes(membership.role)) throw createError({ statusCode: 403, statusMessage: 'Your role does not allow this' })
  return { user, role: membership.role, workspace: membership.workspace }
}

/** Display name of a dashboard user, for emails sent on their behalf. */
export function userDisplayName(user: { email?: string, user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {}
  const name = [metadata.name, metadata.full_name].find(value => typeof value === 'string' && value.trim())
  return (name as string | undefined)?.trim() || user.email?.split('@')[0] || 'The team'
}
