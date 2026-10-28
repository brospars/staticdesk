<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  buildEmbedSnippet,
  parseSiteSettings,
  siteSettingsFormSchema,
  type SiteSettingsForm,
  type SiteSettingsFormInput,
} from '@staticdesk/core'

definePageMeta({ layout: 'dashboard' })

useSeoMeta({ title: 'Site settings · StaticDesk', robots: 'noindex' })

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const config = useRuntimeConfig()
const appUrl = useAppUrl()
const { current } = useWorkspaces()
const { copy } = useClipboard()

const siteId = String(route.params.id)
const canManage = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')
const turnstileAvailable = Boolean(config.public.turnstileSiteKey)

const { data: site, refresh } = await useAsyncData(`site-${siteId}`, async () => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, workspace_id, name, public_key, allowed_origins, settings, widgets(id, kind, name, enabled)')
    .eq('id', siteId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Site not found', fatal: true })
  return data
})

// The form edits a text area of origins; the schema receives an array.
const origins = ref('')
const state = reactive<Omit<SiteSettingsFormInput, 'allowedOrigins'>>({
  name: '',
  locale: null,
  themeMode: 'auto',
  primaryColor: null,
  allowLocalhost: true,
  turnstile: false,
})

watch(site, (value) => {
  if (!value) return
  const settings = parseSiteSettings(value.settings)
  origins.value = value.allowed_origins.join('\n')
  Object.assign(state, {
    name: value.name,
    locale: settings.locale,
    themeMode: settings.theme.mode,
    primaryColor: settings.theme.primaryColor,
    allowLocalhost: settings.allowLocalhost,
    turnstile: settings.turnstile,
  })
}, { immediate: true })

const formState = computed<SiteSettingsFormInput>(() => ({
  ...state,
  primaryColor: state.primaryColor || null,
  allowedOrigins: origins.value.split(/[\s,]+/).filter(Boolean),
}))

const localeOptions = [
  { label: 'Visitor\'s browser language', value: null },
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
]
const modeOptions = [
  { label: 'Follow the visitor\'s system', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

async function save(event: FormSubmitEvent<SiteSettingsForm>) {
  const { name, allowedOrigins, locale, themeMode, primaryColor, allowLocalhost, turnstile } = event.data
  // Keep keys this form does not edit.
  const settings = {
    ...(site.value?.settings as Record<string, unknown> | null),
    locale,
    theme: { mode: themeMode, primaryColor },
    allowLocalhost,
    turnstile,
  }
  const { error } = await supabase
    .from('sites')
    .update({ name, allowed_origins: [...new Set(allowedOrigins)], settings })
    .eq('id', siteId)
  if (error) {
    toast.add({ title: 'Could not save the settings', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Settings saved', description: 'Widgets pick them up within a minute.', color: 'success' })
  await refresh()
}

async function toggleWidget(id: string, enabled: boolean) {
  const { error } = await supabase.from('widgets').update({ enabled }).eq('id', id)
  if (error) toast.add({ title: 'Could not update the widget', description: error.message, color: 'error' })
  await refresh()
}

function snippetFor(kind: Parameters<typeof buildEmbedSnippet>[0]['kind']) {
  return buildEmbedSnippet({ scriptUrl: `${appUrl.value}/widget.js`, siteKey: site.value!.public_key, kind })
}
</script>

<template>
  <UContainer
    v-if="site"
    class="space-y-8 py-8"
  >
    <div>
      <UButton
        to="/app/sites"
        variant="link"
        color="neutral"
        icon="i-lucide-arrow-left"
        class="px-0"
      >
        Sites
      </UButton>
      <h1 class="text-2xl font-semibold">
        {{ site.name }}
      </h1>
      <p class="text-sm text-muted">
        Public key: <code>{{ site.public_key }}</code>
      </p>
    </div>

    <UPageCard
      title="Settings"
      description="Changes reach the widgets within a minute."
    >
      <UForm
        :schema="siteSettingsFormSchema"
        :state="formState"
        :disabled="!canManage"
        class="space-y-5"
        @submit="save"
      >
        <UFormField
          label="Name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Allowed origins"
          name="allowedOrigins"
          help="One per line. Only pages on these origins can use the widgets. Wildcards such as https://*.acme.dev match subdomains."
        >
          <UTextarea
            v-model="origins"
            :rows="3"
            placeholder="https://docs.acme.dev"
            class="w-full font-mono"
          />
        </UFormField>

        <UFormField
          name="allowLocalhost"
          description="Lets you preview the widgets on http://localhost."
        >
          <USwitch
            v-model="state.allowLocalhost"
            label="Allow localhost"
          />
        </UFormField>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField
            label="Language"
            name="locale"
          >
            <USelect
              v-model="state.locale"
              :items="localeOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Color scheme"
            name="themeMode"
          >
            <USelect
              v-model="state.themeMode"
              :items="modeOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Primary color"
          name="primaryColor"
          help="Hex color used for buttons. Leave empty for the default."
        >
          <div class="flex items-center gap-3">
            <span
              class="size-8 rounded-md border border-default"
              :style="{ background: state.primaryColor || '#4f46e5' }"
            />
            <UInput
              :model-value="state.primaryColor ?? ''"
              placeholder="#4f46e5"
              class="w-40 font-mono"
              @update:model-value="value => state.primaryColor = String(value).trim() || null"
            />
          </div>
        </UFormField>

        <UFormField
          name="turnstile"
          :description="turnstileAvailable
            ? 'Visitors solve an invisible Cloudflare Turnstile challenge before sending.'
            : 'Turnstile is not configured on this server (NUXT_PUBLIC_TURNSTILE_SITE_KEY).'"
        >
          <USwitch
            v-model="state.turnstile"
            :disabled="!turnstileAvailable"
            label="Require an anti-spam challenge"
          />
        </UFormField>

        <UButton
          v-if="canManage"
          type="submit"
          loading-auto
        >
          Save settings
        </UButton>
      </UForm>
    </UPageCard>

    <UPageCard
      title="Widgets"
      description="Paste a widget's snippet where it should appear on your site."
    >
      <div class="space-y-6">
        <div
          v-for="widget in site?.widgets ?? []"
          :key="widget.id"
          class="space-y-2"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-medium">
                {{ widget.name }}
              </p>
              <p class="text-sm text-muted">
                {{ widget.kind }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <UButton
                v-if="widget.kind === 'contact'"
                :to="`/app/widgets/${widget.id}`"
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-settings-2"
              >
                Configure
              </UButton>
              <USwitch
                :model-value="widget.enabled"
                :disabled="!canManage"
                :label="widget.enabled ? 'Enabled' : 'Disabled'"
                @update:model-value="value => toggleWidget(widget.id, value)"
              />
            </div>
          </div>
          <div class="relative">
            <pre class="overflow-x-auto rounded-md bg-elevated p-3 pr-12 text-xs"><code>{{ snippetFor(widget.kind) }}</code></pre>
            <UButton
              class="absolute top-1.5 right-1.5"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-copy"
              aria-label="Copy snippet"
              @click="copy(snippetFor(widget.kind))"
            />
          </div>
        </div>
      </div>
    </UPageCard>

    <SiteWebhooksCard
      v-if="canManage && site"
      :site-id="site.id"
      :workspace-id="site.workspace_id"
    />
  </UContainer>
</template>
