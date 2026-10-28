<script setup lang="ts">
useSeoMeta({ title: 'Sites · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const { current } = useWorkspaces()

const { data: sites } = await useAsyncData(
  'sites',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, allowed_origins, widgets(id)')
      .eq('workspace_id', current.value.id)
      .order('created_at')
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id] },
)
</script>

<template>
  <UContainer class="space-y-6 py-12">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Sites
      </h1>
      <UButton
        to="/app/onboarding"
        icon="i-lucide-plus"
      >
        Add a site
      </UButton>
    </div>

    <p
      v-if="!sites?.length"
      class="text-muted"
    >
      No site yet.
    </p>

    <div class="grid gap-4 sm:grid-cols-2">
      <UPageCard
        v-for="site in sites"
        :key="site.id"
        :title="site.name"
        :description="site.allowed_origins.join(', ') || 'No allowed origin'"
        :to="`/app/sites/${site.id}`"
        icon="i-lucide-globe"
      >
        <UBadge
          color="neutral"
          variant="subtle"
        >
          {{ site.widgets.length }} widget(s)
        </UBadge>
      </UPageCard>
    </div>
  </UContainer>
</template>
