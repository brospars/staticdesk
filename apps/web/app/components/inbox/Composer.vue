<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { fillTemplate, type ThreadStatus } from '@staticdesk/core'

const props = defineProps<{
  threadId: string
  workspaceId: string
  /** Template variables for saved replies: name, email, site, agent. */
  variables: Record<string, string | null>
  /** Set when emails to the contact are suppressed (bounce or complaint). */
  suppressed: boolean
}>()

const emit = defineEmits<{ sent: [] }>()
const typing = defineModel<boolean>('typing', { default: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const mode = ref<'reply' | 'note'>('reply')
const body = ref('')
const sending = ref(false)

watch(body, value => (typing.value = mode.value === 'reply' && value.trim().length > 0))
watch(() => props.threadId, () => {
  body.value = ''
  mode.value = 'reply'
})

const { data: savedReplies } = useAsyncData(
  () => `saved-replies:${props.workspaceId}`,
  async () => {
    const { data, error } = await supabase
      .from('saved_replies')
      .select('id, title, body')
      .eq('workspace_id', props.workspaceId)
      .order('title')
    if (error) throw error
    return data
  },
  { default: () => [] },
)

const savedReplyItems = computed<DropdownMenuItem[][]>(() => [
  savedReplies.value.map(reply => ({
    label: reply.title,
    onSelect: () => {
      const text = fillTemplate(reply.body, props.variables)
      body.value = body.value.trim() ? `${body.value.trimEnd()}\n\n${text}` : text
    },
  })),
  [{ label: 'Manage saved replies', icon: 'i-lucide-settings', to: '/app/settings/saved-replies' }],
])

async function send(status?: ThreadStatus) {
  const text = body.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    if (mode.value === 'note') {
      const { error } = await supabase.from('messages').insert({
        workspace_id: props.workspaceId,
        thread_id: props.threadId,
        direction: 'note',
        author_id: user.value!.sub,
        body: text,
      })
      if (error) throw new Error(error.message)
    }
    else {
      await $fetch(`/api/threads/${props.threadId}/reply`, { method: 'POST', body: { body: text, status } })
    }
    body.value = ''
    emit('sent')
  }
  catch (cause) {
    const description = (cause as { statusMessage?: string, message?: string }).statusMessage ?? (cause as Error).message
    toast.add({ title: mode.value === 'note' ? 'Could not add the note' : 'Could not send the reply', description, color: 'error' })
  }
  finally {
    sending.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send(mode.value === 'reply' ? 'pending' : undefined)
  }
}
</script>

<template>
  <div
    class="rounded-lg border"
    :class="mode === 'note' ? 'border-warning/40 bg-warning/5' : 'border-default'"
  >
    <div class="flex items-center gap-2 border-b border-default px-2 py-1">
      <UTabs
        v-model="mode"
        :items="[{ label: 'Reply', value: 'reply', icon: 'i-lucide-reply' }, { label: 'Internal note', value: 'note', icon: 'i-lucide-sticky-note' }]"
        :content="false"
        variant="link"
        size="xs"
      />
      <UDropdownMenu
        :items="savedReplyItems"
        :content="{ align: 'end' }"
        class="ms-auto"
      >
        <UButton
          label="Saved replies"
          icon="i-lucide-message-square-text"
          color="neutral"
          variant="ghost"
          size="xs"
        />
      </UDropdownMenu>
    </div>

    <UTextarea
      v-model="body"
      :placeholder="mode === 'note' ? 'Only your team sees notes' : suppressed ? 'Emails to this contact are suppressed' : 'Write your reply…'"
      :disabled="mode === 'reply' && suppressed"
      :aria-label="mode === 'note' ? 'Internal note' : 'Reply'"
      autoresize
      :rows="4"
      :maxrows="16"
      variant="none"
      class="w-full"
      @keydown="onKeydown"
    />

    <div class="flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
      <span class="me-auto hidden text-xs text-muted sm:inline">
        <UKbd value="meta" /> <UKbd value="enter" /> to send
      </span>
      <template v-if="mode === 'reply'">
        <UButton
          label="Send and resolve"
          color="neutral"
          variant="outline"
          :disabled="!body.trim() || suppressed"
          :loading="sending"
          @click="send('resolved')"
        />
        <UButton
          label="Send"
          icon="i-lucide-send"
          :disabled="!body.trim() || suppressed"
          :loading="sending"
          @click="send('pending')"
        />
      </template>
      <UButton
        v-else
        label="Add note"
        icon="i-lucide-sticky-note"
        color="warning"
        :disabled="!body.trim()"
        :loading="sending"
        @click="send()"
      />
    </div>
  </div>
</template>
