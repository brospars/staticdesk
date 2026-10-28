<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  commentsWidgetFormSchema,
  parseCommentsWidgetConfig,
  type CommentsWidgetForm,
  type CommentsWidgetFormInput,
} from '@staticdesk/core'

const props = defineProps<{ widget: { id: string, name: string, config: unknown }, disabled: boolean }>()
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()

// The title is edited as text; empty means the translated default.
const state = reactive<Omit<CommentsWidgetFormInput, 'title'> & { title: string }>({
  name: '',
  title: '',
  allowAnonymous: true,
  moderation: 'anonymous',
  bannedWords: [],
  sort: 'oldest',
})

watch(() => props.widget, (widget) => {
  const config = parseCommentsWidgetConfig(widget.config)
  Object.assign(state, { ...config, name: widget.name, title: config.title ?? '' })
}, { immediate: true })

const moderationOptions = [
  { label: 'Publish right away', value: 'none' },
  { label: 'Approve anonymous comments first', value: 'anonymous' },
  { label: 'Approve every comment first', value: 'all' },
]
const sortOptions = [
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Newest first', value: 'newest' },
]

async function save(event: FormSubmitEvent<CommentsWidgetForm>) {
  const { name, ...config } = event.data
  // Keep keys this form does not edit.
  const stored = { ...(props.widget.config as Record<string, unknown> | null), ...config }
  const { error } = await supabase.from('widgets').update({ name, config: stored }).eq('id', props.widget.id)
  if (error) {
    toast.add({ title: 'Could not save the widget', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Comments saved', description: 'Widgets pick up changes within a minute.', color: 'success' })
  emit('saved')
}
</script>

<template>
  <UForm
    :schema="commentsWidgetFormSchema"
    :state="state"
    :disabled="disabled"
    class="space-y-8"
    @submit="save"
  >
    <UPageCard
      title="Display"
      description="Leave the title empty to use the default, translated into the visitor's language."
    >
      <div class="space-y-5">
        <UFormField
          label="Name in the dashboard"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField
            label="Title"
            name="title"
          >
            <UInput
              v-model="state.title"
              placeholder="Comments"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Order"
            name="sort"
          >
            <USelect
              v-model="state.sort"
              :items="sortOptions"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </UPageCard>

    <UPageCard
      title="Moderation"
      description="Comments waiting for approval appear in Comments, in the sidebar."
    >
      <div class="space-y-5">
        <UFormField
          name="allowAnonymous"
          description="Visitors can leave the name empty. Anonymous comments show as “Visitor #a1b2”."
        >
          <USwitch
            v-model="state.allowAnonymous"
            label="Allow anonymous comments"
          />
        </UFormField>
        <UFormField
          label="Approval"
          name="moderation"
          help="Comments with more than two links always wait for approval."
        >
          <USelect
            v-model="state.moderation"
            :items="moderationOptions"
            class="w-full sm:w-96"
          />
        </UFormField>
        <UFormField
          label="Banned words"
          name="bannedWords"
          help="Comments containing one of these words wait for approval. Press Enter after each word."
        >
          <UInputTags
            v-model="state.bannedWords"
            :max="200"
            :max-length="60"
            add-on-blur
            add-on-paste
            class="w-full"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UButton
      v-if="!disabled"
      type="submit"
      loading-auto
    >
      Save comments
    </UButton>
  </UForm>
</template>
