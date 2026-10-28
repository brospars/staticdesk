<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { webhookFormSchema, type WebhookForm, type WebhookFormInput } from '@staticdesk/core'

const props = defineProps<{
  siteId: string
  workspaceId: string
}>()

const supabase = useSupabaseClient()
const toast = useToast()
const { copy } = useClipboard()

// Only owners and admins can read webhooks (RLS), so members see an empty list.
const { data: webhooks, refresh } = await useAsyncData(`webhooks-${props.siteId}`, async () => {
  const { data, error } = await supabase
    .from('webhooks')
    .select('id, kind, url, secret, enabled, last_delivery_at, last_status, last_error')
    .eq('site_id', props.siteId)
    .order('created_at')
  if (error) throw error
  return data
})

const kindOptions = [
  { label: 'Custom URL (signed JSON)', value: 'custom' },
  { label: 'Slack', value: 'slack' },
  { label: 'Discord', value: 'discord' },
]
const kindLabels: Record<string, string> = { custom: 'Custom URL', slack: 'Slack', discord: 'Discord' }
const placeholders: Record<string, string> = {
  custom: 'https://example.com/staticdesk-webhook',
  slack: 'https://hooks.slack.com/services/…',
  discord: 'https://discord.com/api/webhooks/…',
}

const state = reactive<WebhookFormInput>({ kind: 'custom', url: '' })
const revealed = ref<string | null>(null)

async function add(event: FormSubmitEvent<WebhookForm>) {
  const { error } = await supabase.from('webhooks').insert({
    workspace_id: props.workspaceId,
    site_id: props.siteId,
    kind: event.data.kind,
    url: event.data.url,
  })
  if (error) {
    toast.add({ title: 'Could not add the webhook', description: error.message, color: 'error' })
    return
  }
  state.url = ''
  toast.add({ title: 'Webhook added', color: 'success' })
  await refresh()
}

async function toggle(id: string, enabled: boolean) {
  const { error } = await supabase.from('webhooks').update({ enabled }).eq('id', id)
  if (error) toast.add({ title: 'Could not update the webhook', description: error.message, color: 'error' })
  await refresh()
}

async function remove(id: string) {
  const { error } = await supabase.from('webhooks').delete().eq('id', id)
  if (error) toast.add({ title: 'Could not delete the webhook', description: error.message, color: 'error' })
  await refresh()
}

async function test(id: string) {
  try {
    const result = await $fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
    toast.add(result.ok
      ? { title: 'Test message delivered', description: `HTTP ${result.status}`, color: 'success' }
      : { title: 'Test delivery failed', description: result.error ?? undefined, color: 'error' })
  }
  catch (error) {
    toast.add({ title: 'Could not send the test', description: (error as { statusMessage?: string }).statusMessage, color: 'error' })
  }
  await refresh()
}

function lastDelivery(webhook: NonNullable<typeof webhooks.value>[number]) {
  if (!webhook.last_delivery_at) return 'Never delivered'
  const when = new Date(webhook.last_delivery_at).toLocaleString()
  return webhook.last_error ? `Failed ${when}: ${webhook.last_error}` : `Delivered ${when} (HTTP ${webhook.last_status})`
}
</script>

<template>
  <UPageCard
    title="Webhooks"
    description="Send each new contact message to Slack, Discord or your own endpoint."
  >
    <div class="space-y-6">
      <div
        v-for="webhook in webhooks ?? []"
        :key="webhook.id"
        class="space-y-2 rounded-md border border-default p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium">
              {{ kindLabels[webhook.kind] }}
            </p>
            <p class="truncate font-mono text-sm text-muted">
              {{ webhook.url }}
            </p>
          </div>
          <USwitch
            :model-value="webhook.enabled"
            :label="webhook.enabled ? 'Enabled' : 'Disabled'"
            @update:model-value="value => toggle(webhook.id, value)"
          />
        </div>
        <p
          class="text-sm"
          :class="webhook.last_error ? 'text-error' : 'text-muted'"
        >
          {{ lastDelivery(webhook) }}
        </p>
        <div
          v-if="webhook.kind === 'custom'"
          class="flex flex-wrap items-center gap-2 text-sm"
        >
          <span class="text-muted">Signing secret:</span>
          <code>{{ revealed === webhook.id ? webhook.secret : 'whsec_••••••••' }}</code>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :icon="revealed === webhook.id ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="revealed === webhook.id ? 'Hide the secret' : 'Show the secret'"
            @click="revealed = revealed === webhook.id ? null : webhook.id"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-copy"
            aria-label="Copy the secret"
            @click="copy(webhook.secret)"
          />
        </div>
        <div class="flex gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-send"
            loading-auto
            @click="test(webhook.id)"
          >
            Send a test
          </UButton>
          <UButton
            size="sm"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            loading-auto
            @click="remove(webhook.id)"
          >
            Delete
          </UButton>
        </div>
      </div>

      <UForm
        :schema="webhookFormSchema"
        :state="state"
        class="flex flex-wrap items-start gap-3"
        @submit="add"
      >
        <UFormField name="kind">
          <USelect
            v-model="state.kind"
            :items="kindOptions"
            class="w-56"
          />
        </UFormField>
        <UFormField
          name="url"
          class="min-w-64 flex-1"
        >
          <UInput
            v-model="state.url"
            :placeholder="placeholders[state.kind]"
            class="w-full font-mono"
          />
        </UFormField>
        <UButton
          type="submit"
          icon="i-lucide-plus"
          loading-auto
        >
          Add webhook
        </UButton>
      </UForm>

      <p class="text-sm text-muted">
        Custom endpoints receive a JSON body with a <code>StaticDesk-Signature: t=…,v1=…</code> header:
        the hex HMAC-SHA256 of <code>&lt;t&gt;.&lt;body&gt;</code> with the signing secret.
      </p>
    </div>
  </UPageCard>
</template>
