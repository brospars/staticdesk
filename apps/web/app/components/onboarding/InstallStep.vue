<script setup lang="ts">
import { buildEmbedSnippet, type WidgetKind } from '@staticdesk/core'

const props = defineProps<{ siteId: string, publicKey: string, kind: WidgetKind }>()

const supabase = useSupabaseClient()
const appUrl = useAppUrl()
const { copy, copied } = useClipboard()

const snippet = computed(() => buildEmbedSnippet({
  scriptUrl: `${appUrl.value}/widget.js`,
  siteKey: props.publicKey,
  kind: props.kind,
}))

// Polls for the first event sent by the widget to confirm the installation.
const installed = ref(false)
const { pause } = useIntervalFn(async () => {
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', props.siteId)
  if (count) {
    installed.value = true
    pause()
  }
}, 5000)
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Paste this snippet where the widget should appear, or before <code>&lt;/body&gt;</code>.
    </p>
    <div class="relative">
      <pre class="overflow-x-auto rounded-md bg-elevated p-4 pr-12 text-sm"><code>{{ snippet }}</code></pre>
      <UButton
        class="absolute top-2 right-2"
        color="neutral"
        variant="ghost"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        aria-label="Copy snippet"
        @click="copy(snippet)"
      />
    </div>

    <UAlert
      v-if="installed"
      color="success"
      icon="i-lucide-circle-check"
      title="Widget installed"
      description="We received the first event from your site."
    />
    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-lucide-loader-circle"
      :ui="{ icon: 'animate-spin' }"
      title="Waiting for your site…"
      description="Open a page with the snippet: this step completes automatically."
    />

    <UButton
      block
      :variant="installed ? 'solid' : 'outline'"
      to="/app"
    >
      {{ installed ? 'Go to the dashboard' : 'Skip for now' }}
    </UButton>
  </div>
</template>
