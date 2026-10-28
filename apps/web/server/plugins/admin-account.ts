import { createClient } from '@supabase/supabase-js'

import { ensureAccount } from '../utils/accounts'

/**
 * NUXT_ADMIN_EMAIL: creates this account on startup if it does not exist, for
 * instances that refuse sign-ups (invite-only). Retries while Supabase starts.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const email = String(config.adminEmail || '').trim().toLowerCase()
  const key = config.supabase?.secretKey || config.supabase?.serviceKey
  if (!email || !key || !config.public.supabase?.url) return

  const admin = createClient(config.public.supabase.url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin
  const attempt = async (left: number) => {
    try {
      if (await ensureAccount(admin, email) === 'created') console.info(`[accounts] created the admin account ${email}`)
    }
    catch (error) {
      if (left > 0) setTimeout(() => attempt(left - 1), 5000)
      else console.error('[accounts] could not create the admin account', error)
    }
  }
  // After every plugin is set up (the internal Supabase URL among them).
  setTimeout(() => attempt(12), 0)
})
