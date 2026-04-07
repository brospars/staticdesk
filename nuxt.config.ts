export default defineNuxtConfig({
  compatibilityDate: "2026-04-07",
  devtools: { enabled: false },
  modules: ["@nuxt/ui"],
  nitro: {
    preset: "vercel",
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },
  typescript: {
    strict: true,
  },
})
