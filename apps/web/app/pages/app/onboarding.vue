<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { slugify, workspaceSchema, type WorkspaceInput } from '@staticdesk/core'

useSeoMeta({ title: 'Get started · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const toast = useToast()
const { refresh, select } = useWorkspaces()

const state = reactive<WorkspaceInput>({ name: '', slug: '' })
const slugTouched = ref(false)

watch(() => state.name, (name) => {
  if (!slugTouched.value) state.slug = slugify(name)
})

async function createWorkspace(event: FormSubmitEvent<WorkspaceInput>) {
  const { data, error } = await supabase.rpc('create_workspace', event.data)
  if (error) {
    const taken = error.code === '23505'
    toast.add({
      title: taken ? 'This ID is already taken' : 'Could not create the workspace',
      description: taken ? 'Pick another workspace ID.' : error.message,
      color: 'error',
    })
    return
  }
  select(data.id)
  await refresh()
  await navigateTo('/app')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <UPageCard
      class="w-full max-w-lg"
      title="Create your workspace"
      description="A workspace groups your sites, widgets and team."
      icon="i-lucide-building-2"
    >
      <UForm
        :schema="workspaceSchema"
        :state="state"
        class="space-y-4"
        @submit="createWorkspace"
      >
        <UFormField
          label="Workspace name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Acme Docs"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Workspace ID"
          name="slug"
          help="Unique identifier: lowercase letters, numbers and dashes."
          required
        >
          <UInput
            v-model="state.slug"
            class="w-full"
            @update:model-value="slugTouched = true"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          loading-auto
        >
          Create workspace
        </UButton>
      </UForm>
    </UPageCard>
  </div>
</template>
