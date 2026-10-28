<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Signing in · StaticDesk', robots: 'noindex' })

const user = useSupabaseUser()
const redirect = useSupabaseCookieRedirect()

// The Supabase client exchanges the code from the URL, then populates the user.
watch(user, () => {
  if (user.value) {
    navigateTo(safeRedirectPath(redirect.pluck()), { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center gap-2 text-muted">
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin"
    />
    Signing you in…
  </div>
</template>
