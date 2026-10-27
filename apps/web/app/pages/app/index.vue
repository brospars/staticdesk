<script setup lang="ts">
useSeoMeta({ title: 'Dashboard · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <UContainer class="py-12">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Dashboard
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-log-out"
        @click="signOut"
      >
        Sign out
      </UButton>
    </div>
    <p class="mt-4 text-muted">
      Signed in as {{ user?.email }}
    </p>
  </UContainer>
</template>
