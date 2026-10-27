import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

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
