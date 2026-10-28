import type { SupabaseClient } from '@supabase/supabase-js'

type AuthAdmin = Pick<SupabaseClient['auth']['admin'], 'createUser'>

/**
 * Creates a confirmed account for this email unless one exists, so the person
 * can sign in with a magic link even when Supabase Auth refuses sign-ups.
 */
export async function ensureAccount(admin: AuthAdmin, email: string): Promise<'created' | 'exists'> {
  const { error } = await admin.createUser({ email, email_confirm: true })
  if (!error) return 'created'
  if (error.code === 'email_exists') return 'exists'
  throw error
}
