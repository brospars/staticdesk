<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { siteSchema, type Site, type SiteInput } from '@staticdesk/core'

const props = defineProps<{ workspaceId: string }>()
const emit = defineEmits<{ created: [site: { id: string, publicKey: string }] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const state = reactive<SiteInput>({ name: '', origin: '' })

async function onSubmit(event: FormSubmitEvent<Site>) {
  const { data, error } = await supabase
    .from('sites')
    .insert({
      workspace_id: props.workspaceId,
      name: event.data.name,
      allowed_origins: [event.data.origin],
    })
    .select('id, public_key')
    .single()
  if (error) {
    toast.add({ title: 'Could not create the site', description: error.message, color: 'error' })
    return
  }
  emit('created', { id: data.id, publicKey: data.public_key })
}
</script>

<template>
  <UForm
    :schema="siteSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField
      label="Site name"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="Acme documentation"
        autofocus
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Site URL"
      name="origin"
      help="Only pages on this domain can load your widgets. You can add more domains later."
      required
    >
      <UInput
        v-model="state.origin"
        type="url"
        placeholder="https://docs.acme.dev"
        class="w-full"
      />
    </UFormField>

    <UButton
      type="submit"
      block
      loading-auto
    >
      Add site
    </UButton>
  </UForm>
</template>
