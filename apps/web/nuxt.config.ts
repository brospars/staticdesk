import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase', '@vueuse/nuxt'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // 'saas' enables billing and quotas; 'selfhost' disables them.
      edition: 'selfhost',
      // OAuth providers enabled in Supabase Auth, comma-separated: 'github,google'.
      authProviders: '',
      // Public URL of this app (serves widget.js). Defaults to the request origin.
      appUrl: '',
    },
  },
  compatibilityDate: '2026-10-27',
  typescript: {
    strict: true,
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  supabase: {
    types: fileURLToPath(new URL('../../packages/core/src/database.types.ts', import.meta.url)),
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Only the dashboard requires a session; the landing page stays public.
      include: ['/app', '/app/*'],
      saveRedirectToCookie: true,
    },
  },
})
