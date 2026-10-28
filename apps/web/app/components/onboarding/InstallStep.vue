<script setup lang="ts">
import { buildDocusaurusSnippet, buildEmbedSnippet, type WidgetKind } from '@staticdesk/core'

const props = defineProps<{ siteId: string, publicKey: string, kind: WidgetKind }>()

const supabase = useSupabaseClient()
const appUrl = useAppUrl()
const { copy, copied } = useClipboard()

const scriptUrl = computed(() => `${appUrl.value}/widget.js`)
// The Docusaurus plugin only adds the contact form for now.
const targets = computed(() => [
  {
    label: 'HTML',
    value: 'html',
    help: 'Paste this snippet where the widget should appear, or before </body>. Works with any static site.',
    code: buildEmbedSnippet({ scriptUrl: scriptUrl.value, siteKey: props.publicKey, kind: props.kind }),
  },
  ...(props.kind === 'contact'
    ? [{
        label: 'Docusaurus',
        value: 'docusaurus',
        help: 'Install the plugin and add it to docusaurus.config.js: the contact button shows on every page.',
        code: buildDocusaurusSnippet({ scriptUrl: scriptUrl.value, siteKey: props.publicKey }),
      }]
    : []),
])
const target = ref('html')
const current = computed(() => targets.value.find(item => item.value === target.value) ?? targets.value[0]!)

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
    <UTabs
      v-if="targets.length > 1"
      v-model="target"
      :items="targets"
      :content="false"
      variant="link"
      size="sm"
    />
    <p class="text-sm text-muted">
      {{ current.help }}
    </p>
    <div class="relative">
      <pre class="overflow-x-auto rounded-md bg-elevated p-4 pr-12 text-sm"><code>{{ current.code }}</code></pre>
      <UButton
        class="absolute top-2 right-2"
        color="neutral"
        variant="ghost"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        aria-label="Copy snippet"
        @click="copy(current.code)"
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
