// Sends signed-in users without a workspace to onboarding.
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/app' && !to.path.startsWith('/app/')) return
  if (to.path.startsWith('/app/onboarding')) return

  // Unauthenticated visitors are handled by the Supabase auth redirect.
  const user = useSupabaseUser()
  if (!user.value) return

  const { ensureLoaded } = useWorkspaces()
  const workspaces = await ensureLoaded()
  if (!workspaces.length) {
    return navigateTo('/app/onboarding')
  }
})
