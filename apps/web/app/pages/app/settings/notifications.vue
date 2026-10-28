<script setup lang="ts">
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '@staticdesk/core'

definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Notifications · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const { current } = useWorkspaces()

const preferences = reactive<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES })

const { data: stored, refresh } = await useAsyncData(
  'notification-preferences',
  async () => {
    if (!current.value || !user.value) return null
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('new_threads, replies, daily_digest')
      .eq('workspace_id', current.value.id)
      .eq('user_id', user.value.sub)
      .maybeSingle()
    if (error) throw error
    Object.assign(preferences, data
      ? { newThreads: data.new_threads, replies: data.replies, dailyDigest: data.daily_digest }
      : DEFAULT_NOTIFICATION_PREFERENCES)
    return data
  },
  { watch: [() => current.value?.id] },
)

const newThreadItems = [
  { label: 'Every new conversation', value: 'all' },
  { label: 'None', value: 'none' },
]
const replyItems = [
  { label: 'Every reply', value: 'all' },
  { label: 'Replies in my conversations and unassigned ones', value: 'assigned' },
  { label: 'None', value: 'none' },
]

async function save() {
  if (!current.value || !user.value) return
  const values = { new_threads: preferences.newThreads, replies: preferences.replies, daily_digest: preferences.dailyDigest }
  // Members may only update their preference columns, so no upsert.
  const { error } = stored.value
    ? await supabase.from('notification_preferences').update(values).eq('workspace_id', current.value.id).eq('user_id', user.value.sub)
    : await supabase.from('notification_preferences').insert({ workspace_id: current.value.id, user_id: user.value.sub, ...values })
  if (error) {
    toast.add({ title: 'Could not save your preferences', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Preferences saved', color: 'success' })
  await refresh()
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <div>
      <h1 class="text-2xl font-semibold">
        Notifications
      </h1>
      <p class="text-muted">
        Emails you receive about {{ current?.name }}. Each member sets their own.
      </p>
    </div>

    <UPageCard>
      <form
        class="space-y-6"
        @submit.prevent="save"
      >
        <UFormField
          label="New conversations"
          description="A visitor sends a message through one of your forms."
        >
          <URadioGroup
            v-model="preferences.newThreads"
            :items="newThreadItems"
          />
        </UFormField>
        <UFormField
          label="Visitor replies"
          description="A visitor answers a reply by email."
        >
          <URadioGroup
            v-model="preferences.replies"
            :items="replyItems"
          />
        </UFormField>
        <UFormField
          label="Daily digest"
          description="Every morning, a summary of the open and pending conversations."
        >
          <USwitch
            v-model="preferences.dailyDigest"
            label="Send me the daily digest"
          />
        </UFormField>
        <UButton
          type="submit"
          loading-auto
        >
          Save
        </UButton>
      </form>
    </UPageCard>
  </UContainer>
</template>
