<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { savedReplySchema, type SavedReplyInput } from '@staticdesk/core'

definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Saved replies · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const toast = useToast()
const { current } = useWorkspaces()

const { data: replies, refresh } = await useAsyncData(
  'saved-replies',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase
      .from('saved_replies')
      .select('id, title, body')
      .eq('workspace_id', current.value.id)
      .order('title')
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id], default: () => [] },
)

const editing = ref<string | 'new' | null>(null)
const form = reactive<SavedReplyInput>({ title: '', body: '' })

function edit(reply?: { id: string, title: string, body: string }) {
  editing.value = reply?.id ?? 'new'
  Object.assign(form, { title: reply?.title ?? '', body: reply?.body ?? '' })
}

async function save(event: FormSubmitEvent<SavedReplyInput>) {
  if (!current.value) return
  const { error } = editing.value === 'new'
    ? await supabase.from('saved_replies').insert({ workspace_id: current.value.id, ...event.data })
    : await supabase.from('saved_replies').update(event.data).eq('id', editing.value!)
  if (error) {
    toast.add({ title: 'Could not save the reply', description: error.message, color: 'error' })
    return
  }
  editing.value = null
  await refresh()
}

async function remove(id: string) {
  const { error } = await supabase.from('saved_replies').delete().eq('id', id)
  if (error) toast.add({ title: 'Could not delete the reply', description: error.message, color: 'error' })
  await refresh()
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          Saved replies
        </h1>
        <p class="text-muted">
          Answers your team sends often. Insert them from the reply box.
          Use <code v-pre>{{name}}</code>, <code v-pre>{{email}}</code>, <code v-pre>{{site}}</code> and <code v-pre>{{agent}}</code>;
          <code v-pre>{{name|there}}</code> falls back to "there" when the name is unknown.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="edit()"
      >
        New reply
      </UButton>
    </div>

    <UEmpty
      v-if="!replies.length"
      icon="i-lucide-message-square-text"
      title="No saved reply yet"
      variant="naked"
    />

    <div class="grid gap-4">
      <UPageCard
        v-for="reply in replies"
        :key="reply.id"
        :title="reply.title"
      >
        <p class="line-clamp-4 text-sm whitespace-pre-wrap text-muted">
          {{ reply.body }}
        </p>
        <div class="flex gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-pencil"
            @click="edit(reply)"
          >
            Edit
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="remove(reply.id)"
          >
            Delete
          </UButton>
        </div>
      </UPageCard>
    </div>

    <UModal
      :open="editing !== null"
      :title="editing === 'new' ? 'New saved reply' : 'Edit saved reply'"
      @update:open="open => !open && (editing = null)"
    >
      <template #body>
        <UForm
          :schema="savedReplySchema"
          :state="form"
          class="space-y-4"
          @submit="save"
        >
          <UFormField
            label="Title"
            name="title"
          >
            <UInput
              v-model="form.title"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Reply"
            name="body"
          >
            <UTextarea
              v-model="form.body"
              :rows="8"
              autoresize
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="editing = null"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              loading-auto
            >
              Save
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </UContainer>
</template>
