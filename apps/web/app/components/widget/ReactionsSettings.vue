<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  parseReactionsWidgetConfig,
  reactionsWidgetFormSchema,
  type ReactionsWidgetForm,
  type ReactionsWidgetFormInput,
} from '@staticdesk/core'

const props = defineProps<{ widget: { id: string, name: string, config: unknown }, disabled: boolean }>()
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()

// The title is edited as text; empty means the translated default.
const state = reactive<Omit<ReactionsWidgetFormInput, 'title'> & { title: string }>({
  name: '',
  title: '',
  helpful: true,
  askComment: true,
  emojis: [],
})

watch(() => props.widget, (widget) => {
  const config = parseReactionsWidgetConfig(widget.config)
  Object.assign(state, { ...config, name: widget.name, title: config.title ?? '' })
}, { immediate: true })

const suggestions = ['👍', '❤️', '🎉', '🚀', '👀', '😄', '🤔', '🔥']

function addEmoji(emoji: string) {
  if (!state.emojis.includes(emoji) && state.emojis.length < 8) state.emojis.push(emoji)
}

async function save(event: FormSubmitEvent<ReactionsWidgetForm>) {
  const { name, ...config } = event.data
  // Keep keys this form does not edit.
  const stored = { ...(props.widget.config as Record<string, unknown> | null), ...config }
  const { error } = await supabase.from('widgets').update({ name, config: stored }).eq('id', props.widget.id)
  if (error) {
    toast.add({ title: 'Could not save the widget', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Reactions saved', description: 'Widgets pick up changes within a minute.', color: 'success' })
  emit('saved')
}
</script>

<template>
  <UForm
    :schema="reactionsWidgetFormSchema"
    :state="state"
    :disabled="disabled"
    class="space-y-8"
    @submit="save"
  >
    <UPageCard
      title="Was this helpful?"
      description="Votes and comments show in Feedback, in the sidebar. They are never shown to visitors."
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
        <UFormField name="helpful">
          <USwitch
            v-model="state.helpful"
            label="Ask whether the page was helpful"
          />
        </UFormField>
        <UFormField
          label="Question"
          name="title"
          help="Leave empty to use the default, translated into the visitor's language."
        >
          <UInput
            v-model="state.title"
            placeholder="Was this page helpful?"
            :disabled="!state.helpful || disabled"
            class="w-full"
          />
        </UFormField>
        <UFormField name="askComment">
          <USwitch
            v-model="state.askComment"
            :disabled="!state.helpful || disabled"
            label="After a “no”, ask what could be improved"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard
      title="Emoji reactions"
      description="Up to 8 emojis, with a public counter. Visitors can react with each one once."
    >
      <div class="space-y-3">
        <UFormField
          name="emojis"
          help="Type an emoji and press Enter, or pick one below."
        >
          <UInputTags
            v-model="state.emojis"
            :max="8"
            :max-length="16"
            add-on-blur
            class="w-full"
          />
        </UFormField>
        <div
          v-if="!disabled"
          class="flex flex-wrap gap-1"
        >
          <UButton
            v-for="emoji in suggestions"
            :key="emoji"
            color="neutral"
            variant="outline"
            size="sm"
            :aria-label="`Add ${emoji}`"
            :disabled="state.emojis.includes(emoji)"
            @click="addEmoji(emoji)"
          >
            {{ emoji }}
          </UButton>
        </div>
      </div>
    </UPageCard>

    <UButton
      v-if="!disabled"
      type="submit"
      loading-auto
    >
      Save reactions
    </UButton>
  </UForm>
</template>
