<script setup lang="ts">
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import { sendingDomainSchema, type SendingDomainInput } from '@staticdesk/core'

definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Sending domain · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const toast = useToast()
const { current } = useWorkspaces()
const { public: { edition } } = useRuntimeConfig()

const canManage = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')
const planAllows = computed(() => edition !== 'saas' || current.value?.plan === 'team')

interface DnsRecord { record: string, type: string, name: string, value: string, ttl: string, status: string, priority?: number }

const { data: domain, refresh } = await useAsyncData(
  'sending-domain',
  async () => {
    if (!current.value) return null
    const { data, error } = await supabase
      .from('sending_domains')
      .select('domain, from_local_part, status, records, verified_at')
      .eq('workspace_id', current.value.id)
      .maybeSingle()
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id] },
)

const records = computed(() => (Array.isArray(domain.value?.records) ? domain.value.records as unknown as DnsRecord[] : []))
const columns: TableColumn<DnsRecord>[] = [
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'priority', header: 'Priority' },
  { accessorKey: 'status', header: 'Status' },
]

const form = reactive<SendingDomainInput>({ domain: '', fromLocalPart: 'support' })

function failure(title: string, cause: unknown) {
  toast.add({ title, description: (cause as { statusMessage?: string }).statusMessage, color: 'error' })
}

async function add(event: FormSubmitEvent<SendingDomainInput>) {
  try {
    await $fetch(`/api/workspaces/${current.value!.id}/sending-domain`, { method: 'POST', body: event.data })
    await refresh()
  }
  catch (cause) {
    failure('Could not add the domain', cause)
  }
}

async function verify() {
  try {
    const result = await $fetch(`/api/workspaces/${current.value!.id}/sending-domain/verify`, { method: 'POST' })
    toast.add({
      title: result.status === 'verified' ? 'Domain verified' : 'Not verified yet',
      description: result.status === 'verified' ? 'Replies are now sent from your domain.' : 'DNS changes can take a few hours to spread.',
      color: result.status === 'verified' ? 'success' : 'warning',
    })
    await refresh()
  }
  catch (cause) {
    failure('Could not check the domain', cause)
  }
}

async function remove() {
  try {
    await $fetch(`/api/workspaces/${current.value!.id}/sending-domain`, { method: 'DELETE' })
    await refresh()
  }
  catch (cause) {
    failure('Could not remove the domain', cause)
  }
}

const sender = ref('')
watch(domain, value => (sender.value = value?.from_local_part ?? 'support'), { immediate: true })

async function saveSender() {
  const parsed = sendingDomainSchema.shape.fromLocalPart.safeParse(sender.value)
  if (!parsed.success) {
    toast.add({ title: 'Invalid address', description: parsed.error.issues[0]?.message, color: 'error' })
    return
  }
  const { error } = await supabase.from('sending_domains').update({ from_local_part: parsed.data }).eq('workspace_id', current.value!.id)
  if (error) toast.add({ title: 'Could not save the address', description: error.message, color: 'error' })
  else toast.add({ title: 'Sender address saved', color: 'success' })
  await refresh()
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <div>
      <h1 class="text-2xl font-semibold">
        Sending domain
      </h1>
      <p class="text-muted">
        Send replies to visitors from your own domain, such as support@example.com.
      </p>
    </div>

    <UAlert
      v-if="!planAllows"
      color="info"
      variant="subtle"
      icon="i-lucide-sparkles"
      title="Custom sending domains are part of the Team plan"
    />

    <UPageCard
      v-else-if="!domain && canManage"
      title="Add a domain"
      description="You will get DNS records (SPF, DKIM) to add at your DNS provider."
    >
      <UForm
        :schema="sendingDomainSchema"
        :state="form"
        class="flex flex-col gap-3 sm:flex-row sm:items-start"
        @submit="add"
      >
        <UFormField
          name="fromLocalPart"
          class="sm:w-40"
        >
          <UInput
            v-model="form.fromLocalPart"
            placeholder="support"
            aria-label="Sender name, before the @"
            class="w-full"
          >
            <template #trailing>
              <span class="text-muted">@</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField
          name="domain"
          class="flex-1"
        >
          <UInput
            v-model="form.domain"
            placeholder="example.com"
            aria-label="Domain"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          loading-auto
        >
          Add domain
        </UButton>
      </UForm>
    </UPageCard>

    <p
      v-else-if="!domain"
      class="text-muted"
    >
      No sending domain. Ask an owner or an admin to add one.
    </p>

    <UPageCard
      v-if="domain"
      :title="domain.domain"
    >
      <template #description>
        <UBadge
          :label="domain.status"
          :color="domain.status === 'verified' ? 'success' : domain.status === 'failed' ? 'error' : 'warning'"
          variant="subtle"
        />
        <span
          v-if="domain.status !== 'verified'"
          class="ms-2"
        >Add these records at your DNS provider, then check the domain. Until then, replies use the default address.</span>
      </template>

      <UTable
        :data="records"
        :columns="columns"
        class="text-xs"
      />

      <div
        v-if="canManage"
        class="flex flex-wrap items-end gap-3"
      >
        <UFormField
          label="Sender address"
          class="w-64"
        >
          <UInput
            v-model="sender"
            class="w-full"
          >
            <template #trailing>
              <span class="text-muted">@{{ domain.domain }}</span>
            </template>
          </UInput>
        </UFormField>
        <UButton
          color="neutral"
          variant="outline"
          loading-auto
          @click="saveSender"
        >
          Save address
        </UButton>
        <UButton
          v-if="domain.status !== 'verified'"
          icon="i-lucide-refresh-cw"
          loading-auto
          @click="verify"
        >
          Check DNS records
        </UButton>
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          class="ms-auto"
          loading-auto
          @click="remove"
        >
          Remove domain
        </UButton>
      </div>
    </UPageCard>
  </UContainer>
</template>
