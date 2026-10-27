<script setup lang="ts">
import type { WidgetKind } from '@staticdesk/core'

const props = defineProps<{ workspaceId: string, siteId: string }>()
const emit = defineEmits<{ created: [kind: WidgetKind] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const options: { value: WidgetKind, label: string, description: string }[] = [
  { value: 'contact', label: 'Contact form', description: 'A floating button that opens a contact form. Messages land in your shared inbox.' },
  { value: 'comments', label: 'Comments', description: 'Threaded comments under each page, anonymous or signed.' },
  { value: 'reactions', label: 'Was this helpful?', description: 'Likes and quick feedback, ideal for documentation.' },
  { value: 'reviews', label: 'Reviews', description: 'Star ratings and testimonials.' },
]

const kind = ref<WidgetKind>('contact')
const loading = ref(false)

async function create() {
  loading.value = true
  const label = options.find(option => option.value === kind.value)!.label
  const { error } = await supabase
    .from('widgets')
    .insert({ workspace_id: props.workspaceId, site_id: props.siteId, kind: kind.value, name: label })
  loading.value = false
  if (error) {
    toast.add({ title: 'Could not create the widget', description: error.message, color: 'error' })
    return
  }
  emit('created', kind.value)
}
</script>

<template>
  <div class="space-y-4">
    <URadioGroup
      v-model="kind"
      :items="options"
      variant="card"
    />
    <UButton
      block
      :loading="loading"
      @click="create"
    >
      Continue
    </UButton>
  </div>
</template>
