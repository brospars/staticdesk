<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'
import type { WidgetKind } from '@staticdesk/core'

useSeoMeta({ title: 'Get started · StaticDesk', robots: 'noindex' })

const { current, ensureLoaded, refresh, select } = useWorkspaces()
await ensureLoaded()

const items: StepperItem[] = [
  { title: 'Workspace', icon: 'i-lucide-building-2' },
  { title: 'Site', icon: 'i-lucide-globe' },
  { title: 'Widget', icon: 'i-lucide-layout-template' },
  { title: 'Install', icon: 'i-lucide-code' },
]

const step = ref(current.value ? 1 : 0)
const site = ref<{ id: string, publicKey: string } | null>(null)
const kind = ref<WidgetKind | null>(null)

const descriptions = [
  'A workspace groups your sites, widgets and team.',
  'Which site will use StaticDesk?',
  'Pick your first widget. You can add others later.',
  'Add the widget to your site.',
]

async function onWorkspaceCreated(id: string) {
  select(id)
  await refresh()
  step.value = 1
}

function onSiteCreated(created: { id: string, publicKey: string }) {
  site.value = created
  step.value = 2
}

function onWidgetCreated(created: WidgetKind) {
  kind.value = created
  step.value = 3
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-12">
    <div class="w-full max-w-xl space-y-8">
      <UStepper
        v-model="step"
        :items="items"
        disabled
      />

      <UPageCard
        :title="items[step]?.title"
        :description="descriptions[step]"
      >
        <OnboardingWorkspaceStep
          v-if="step === 0"
          @created="onWorkspaceCreated"
        />
        <OnboardingSiteStep
          v-else-if="step === 1 && current"
          :workspace-id="current.id"
          @created="onSiteCreated"
        />
        <OnboardingWidgetStep
          v-else-if="step === 2 && current && site"
          :workspace-id="current.id"
          :site-id="site.id"
          @created="onWidgetCreated"
        />
        <OnboardingInstallStep
          v-else-if="step === 3 && site && kind"
          :site-id="site.id"
          :public-key="site.publicKey"
          :kind="kind"
        />
      </UPageCard>
    </div>
  </div>
</template>
