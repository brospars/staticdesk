<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'
import { threadLabelsSchema, type ThreadStatus } from '@staticdesk/core'

useSeoMeta({ title: 'Conversation · StaticDesk', robots: 'noindex' })

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const { current } = useWorkspaces()
const { members, memberName } = useWorkspaceMembers()
const refreshList = inject<() => Promise<unknown>>('inbox:refresh', async () => {})

const threadId = computed(() => String(route.params.id))

const { data: thread, refresh: refreshThread } = await useAsyncData(
  () => `thread:${threadId.value}`,
  async () => {
    const { data, error } = await supabase
      .from('threads')
      .select('id, workspace_id, subject, status, labels, assignee_id, created_at, contacts(id, email, name, email_suppressed_at, email_suppression_reason), sites(id, name), widgets(id, name), auto_reply_deliveries(status, send_at, reason, auto_replies(name))')
      .eq('id', threadId.value)
      .maybeSingle()
    if (error) throw error
    return data
  },
)

const { data: messages, refresh: refreshMessages } = await useAsyncData(
  () => `thread-messages:${threadId.value}`,
  async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, direction, author_id, body, metadata, created_at, attachments(id, file_name, size_bytes, storage_path)')
      .eq('thread_id', threadId.value)
      .order('created_at')
    if (error) throw error
    return data
  },
  { default: () => [] },
)

const contactLabel = computed(() => thread.value?.contacts?.name || thread.value?.contacts?.email || 'Visitor')
// A delayed auto-reply still to be sent, or one that failed.
const autoReply = computed(() => {
  const delivery = thread.value?.auto_reply_deliveries[0]
  if (delivery?.status === 'scheduled') {
    const at = new Date(delivery.send_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    return { color: 'info' as const, title: `Auto-reply “${delivery.auto_replies?.name}” scheduled for ${at}`, description: 'It is not sent if someone answers first.' }
  }
  if (delivery?.status === 'failed') {
    return { color: 'warning' as const, title: `Auto-reply “${delivery.auto_replies?.name}” could not be sent`, description: delivery.reason ?? undefined }
  }
  return null
})
const canDelete = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')

function authorOf(message: { direction: string, author_id: string | null, metadata: unknown }) {
  if (message.direction === 'inbound') return contactLabel.value
  if (!message.author_id && isAutoReply(message.metadata)) return 'Auto-reply'
  return message.author_id === user.value?.sub ? 'You' : memberName(message.author_id)
}

// Triage ------------------------------------------------------------------------------

const statusItems = [
  { label: 'Open', value: 'open', icon: 'i-lucide-circle-dot' },
  { label: 'Pending', value: 'pending', icon: 'i-lucide-clock' },
  { label: 'Resolved', value: 'resolved', icon: 'i-lucide-circle-check' },
]
const assigneeItems = computed(() => [
  { label: 'Unassigned', value: 'unassigned' },
  ...members.value.map(member => ({ label: member.user_id === user.value?.sub ? `${member.email} (you)` : member.email, value: member.user_id })),
])

async function update(patch: { status?: ThreadStatus, assignee_id?: string | null, labels?: string[], subject?: string }) {
  if (!thread.value) return
  const { error } = await supabase.from('threads').update(patch).eq('id', thread.value.id)
  if (error) {
    toast.add({ title: 'Could not update the conversation', description: error.message, color: 'error' })
    return
  }
  await Promise.all([refreshThread(), refreshList()])
}

function setLabels(value: string[]) {
  const parsed = threadLabelsSchema.safeParse(value)
  if (!parsed.success) {
    toast.add({ title: 'Invalid label', description: parsed.error.issues[0]?.message, color: 'error' })
    return
  }
  update({ labels: parsed.data })
}

async function liftSuppression() {
  const contact = thread.value?.contacts
  if (!contact) return
  const { error } = await supabase
    .from('contacts')
    .update({ email_suppressed_at: null, email_suppression_reason: null })
    .eq('id', contact.id)
  if (error) toast.add({ title: 'Could not update the contact', description: error.message, color: 'error' })
  await refreshThread()
}

const confirmDelete = ref(false)
async function remove() {
  if (!thread.value) return
  const { error } = await supabase.from('threads').delete().eq('id', thread.value.id)
  if (error) {
    toast.add({ title: 'Could not delete the conversation', description: error.message, color: 'error' })
    return
  }
  confirmDelete.value = false
  await refreshList()
  await navigateTo({ path: '/app/inbox', query: route.query })
}

// Live updates and presence ----------------------------------------------------------

const { typing, viewers, writers } = useInboxPresence(threadId)

let channel: RealtimeChannel | null = null
function subscribe(id: string) {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel(`thread:${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${id}` }, () => refreshMessages())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'threads', filter: `id=eq.${id}` }, () => refreshThread())
    .subscribe()
}
onMounted(() => watch(threadId, subscribe, { immediate: true }))
onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})

async function onSent() {
  typing.value = false
  await Promise.all([refreshMessages(), refreshThread(), refreshList()])
}

const variables = computed(() => ({
  name: thread.value?.contacts?.name ?? null,
  email: thread.value?.contacts?.email ?? null,
  site: thread.value?.sites?.name ?? null,
  agent: String(user.value?.email ?? '').split('@')[0] || null,
}))
</script>

<template>
  <UDashboardPanel id="inbox-thread">
    <template #header>
      <UDashboardNavbar :title="thread?.subject || '(no subject)'">
        <template #leading>
          <UButton
            :to="{ path: '/app/inbox', query: route.query }"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Back to the inbox"
            class="lg:hidden"
          />
        </template>
        <template #right>
          <UAvatarGroup
            v-if="viewers.length"
            size="xs"
          >
            <UTooltip
              v-for="viewer in viewers"
              :key="viewer.userId"
              :text="`${viewer.email} is viewing`"
            >
              <UAvatar :alt="viewer.email" />
            </UTooltip>
          </UAvatarGroup>
          <UButton
            v-if="canDelete && thread"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            aria-label="Delete the conversation"
            @click="confirmDelete = true"
          />
        </template>
      </UDashboardNavbar>

      <div
        v-if="thread"
        class="flex flex-wrap items-center gap-2 border-b border-default px-4 py-2 sm:px-6"
      >
        <USelect
          :model-value="thread.status"
          :items="statusItems"
          size="sm"
          class="w-36"
          aria-label="Status"
          @update:model-value="value => update({ status: value as ThreadStatus })"
        />
        <USelect
          :model-value="thread.assignee_id ?? 'unassigned'"
          :items="assigneeItems"
          size="sm"
          class="w-56"
          icon="i-lucide-user"
          aria-label="Assignee"
          @update:model-value="value => update({ assignee_id: value === 'unassigned' ? null : String(value) })"
        />
        <UInputTags
          :model-value="thread.labels"
          placeholder="Add a label"
          size="sm"
          class="min-w-48 flex-1"
          aria-label="Labels"
          @update:model-value="value => setLabels(value as string[])"
        />
      </div>
    </template>

    <template #body>
      <UEmpty
        v-if="!thread"
        icon="i-lucide-search-x"
        title="Conversation not found"
        description="It may have been deleted."
        variant="naked"
      />

      <div
        v-else
        class="mx-auto flex w-full max-w-3xl flex-col gap-4"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span class="font-medium text-highlighted">{{ contactLabel }}</span>
          <ULink
            v-if="thread.contacts?.name"
            :to="`mailto:${thread.contacts.email}`"
            external
          >
            {{ thread.contacts.email }}
          </ULink>
          <span>· {{ thread.sites?.name }}<template v-if="thread.widgets"> · {{ thread.widgets.name }}</template></span>
        </div>

        <UAlert
          v-if="thread.contacts?.email_suppressed_at"
          color="warning"
          variant="subtle"
          icon="i-lucide-mail-x"
          title="Emails to this contact are suppressed"
          :description="thread.contacts.email_suppression_reason ?? 'The address bounced or reported spam.'"
          :actions="[{ label: 'Allow emails again', color: 'warning', variant: 'outline', onClick: liftSuppression }]"
        />

        <UAlert
          v-if="autoReply"
          :color="autoReply.color"
          variant="subtle"
          icon="i-lucide-bot"
          :title="autoReply.title"
          :description="autoReply.description"
        />

        <InboxMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :author="authorOf(message)"
          :contact-email="thread.contacts?.email"
        />

        <p
          v-if="writers.length"
          class="text-sm text-muted"
          aria-live="polite"
        >
          <UIcon
            name="i-lucide-pencil"
            class="animate-pulse"
          />
          {{ writers.map(writer => writer.email.split('@')[0]).join(', ') }} {{ writers.length > 1 ? 'are' : 'is' }} replying…
        </p>

        <InboxComposer
          v-if="current"
          v-model:typing="typing"
          :thread-id="thread.id"
          :workspace-id="thread.workspace_id"
          :variables="variables"
          :suppressed="Boolean(thread.contacts?.email_suppressed_at)"
          @sent="onSent"
        />
      </div>
      <UModal
        v-model:open="confirmDelete"
        title="Delete this conversation?"
        description="Its messages and notes are deleted for everyone. This cannot be undone."
      >
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="confirmDelete = false"
            />
            <UButton
              label="Delete"
              color="error"
              @click="remove"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
