import { fileURLToPath } from 'node:url'

import { CRON_JOBS } from './shared/cron-jobs'

const databaseTypes = fileURLToPath(new URL('../../packages/core/src/database.types.ts', import.meta.url))
const widgetDist = fileURLToPath(new URL('../../packages/widget/dist', import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase', '@vueuse/nuxt'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Email: 'resend' sends through Resend, 'smtp' through any SMTP server;
    // 'log' prints emails to the console (development).
    mail: {
      driver: 'log',
      from: 'StaticDesk <notifications@staticdesk.app>',
      resendApiKey: '',
      smtpHost: '',
      smtpPort: 587,
      // true for TLS from the start (port 465); otherwise STARTTLS when offered.
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      // Domain receiving visitor replies through Resend inbound, e.g. in.staticdesk.app.
      // Replies are sent with a reply+<thread>@<domain> Reply-To address.
      inboundDomain: '',
      // Signs reply addresses so nobody can post into a thread by guessing its id.
      replySecret: '',
      // Signing secret of the Resend webhook (inbound emails, bounces, complaints).
      resendWebhookSecret: '',
    },
    // Bearer token expected by scheduled jobs (/api/cron/*). Vercel sends CRON_SECRET.
    cronSecret: '',
    // 'internal' runs the scheduled jobs in this process (Docker, a single Node server).
    scheduler: '',
    // Address the server uses to reach Supabase when the public URL does not work from it.
    supabaseInternalUrl: '',
    // Secret used to derive daily visitor fingerprints (hashed IP + user agent).
    fingerprintSecret: '',
    // Read the client IP from X-Forwarded-For (true behind Vercel or a reverse proxy).
    trustProxy: true,
    // Cloudflare Turnstile secret, for sites that require a challenge.
    turnstileSecretKey: '',
    public: {
      // 'saas' enables billing and quotas; 'selfhost' disables them.
      edition: 'selfhost',
      // OAuth providers enabled in Supabase Auth, comma-separated: 'github,google'.
      authProviders: '',
      // Public URL of this app (serves widget.js). Defaults to the request origin.
      appUrl: '',
      // Cloudflare Turnstile site key, sent to widgets of sites that require a challenge.
      turnstileSiteKey: '',
    },
  },
  alias: {
    // @nuxtjs/supabase maps this for the server only; server routes are also
    // typechecked from the app (typed $fetch), where it would resolve to any.
    '#supabase/database': databaseTypes,
  },
  compatibilityDate: '2026-10-27',
  nitro: {
    // Vercel Cron (see shared/cron-jobs.ts).
    vercel: {
      config: {
        crons: CRON_JOBS.map(({ path, schedule }) => ({ path, schedule })),
      },
    },
    // Serves /widget.js from the widget package build. Short cache: the URL is not versioned.
    publicAssets: [{ dir: widgetDist, baseURL: '/', maxAge: 300 }],
  },
  typescript: {
    strict: true,
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  icon: {
    // Bundle the icon sets used by the app instead of fetching them at runtime.
    serverBundle: {
      collections: ['lucide', 'simple-icons'],
    },
  },
  supabase: {
    types: databaseTypes,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Only the dashboard requires a session; the landing page stays public.
      include: ['/app', '/app/*'],
      saveRedirectToCookie: true,
    },
  },
})
