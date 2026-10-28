<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Join a workspace · StaticDesk', robots: 'noindex' })

const route = useRoute()
const user = useSupabaseUser()
const redirect = useSupabaseCookieRedirect()
const { refresh, select } = useWorkspaces()

const error = ref<string | null>(null)

onMounted(async () => {
  if (!user.value) {
    // Come back here after signing in.
    redirect.path.value = route.fullPath
    await navigateTo('/login')
    return
  }

  try {
    const { workspaceId } = await $fetch('/api/invitations/accept', {
      method: 'POST',
      body: { token: route.params.token },
    })
    select(workspaceId)
    await refresh()
    await navigateTo('/app', { replace: true })
  }
  catch (cause) {
    error.value = (cause as { statusMessage?: string }).statusMessage ?? 'Could not accept the invitation'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <UPageCard
      v-if="error"
      class="w-full max-w-md"
      title="Invitation unavailable"
      :description="error"
      icon="i-lucide-mail-x"
    >
      <UButton
        to="/app"
        variant="outline"
        block
      >
        Go to the dashboard
      </UButton>
    </UPageCard>
    <div
      v-else
      class="flex items-center gap-2 text-muted"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin"
      />
      Joining the workspace…
    </div>
  </div>
</template>
