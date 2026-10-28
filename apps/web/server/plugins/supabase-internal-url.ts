import { rewriteFetch } from '../utils/rewrite-fetch'

/**
 * When the server cannot reach Supabase at its public URL (Docker: the public
 * hostname points to the host, or localhost is the app container itself), set
 * NUXT_SUPABASE_INTERNAL_URL: server-side requests to the public URL are sent
 * to this address instead. Browsers and generated links keep the public URL.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const internal = String(config.supabaseInternalUrl || '').replace(/\/$/, '')
  const publicUrl = String(config.public.supabase?.url || '').replace(/\/$/, '')
  if (!internal || !publicUrl || internal === publicUrl) return

  globalThis.fetch = rewriteFetch(globalThis.fetch, publicUrl, internal)
  console.info(`[supabase] server requests to ${publicUrl} go to ${internal}`)
})
