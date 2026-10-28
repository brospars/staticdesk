<script setup lang="ts">
import type { Database } from '@staticdesk/core'

type ModerationStatus = Database['public']['Enums']['moderation_status']

definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Comments · StaticDesk', robots: 'noindex' })

const PAGE_SIZE = 50

const supabase = useSupabaseClient()
const toast = useToast()
const { current } = useWorkspaces()
const { pendingComments, refreshPendingComments } = usePendingComments()

const canDelete = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')
const status = ref<ModerationStatus>('pending')
const siteId = ref<string>('all')
const limit = ref(PAGE_SIZE)
watch([status, siteId], () => (limit.value = PAGE_SIZE))

const statusTabs = computed(() => [
  { label: pendingComments.value ? `Pending (${pendingComments.value})` : 'Pending', value: 'pending' },
  { label: 'Published', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Spam', value: 'spam' },
])

const { data: sites } = await useAsyncData(
  'comments-sites',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase.from('sites').select('id, name').eq('workspace_id', current.value.id).order('name')
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id], default: () => [] },
)
const siteOptions = computed(() => [{ label: 'All sites', value: 'all' }, ...sites.value.map(site => ({ label: site.name, value: site.id }))])
const siteNames = computed(() => new Map(sites.value.map(site => [site.id, site.name])))

const { data: comments, refresh, status: loading } = await useAsyncData(
  'comments-moderation',
  async () => {
    if (!current.value) return []
    let query = supabase
      .from('comments')
      .select('id, site_id, page_id, page_url, parent_id, is_anonymous, author_name, body, status, deleted_at, edited_at, created_at')
      .eq('workspace_id', current.value.id)
      .eq('status', status.value)
      .is('deleted_at', null)
      .order('created_at', { ascending: status.value === 'pending' })
      .limit(limit.value + 1)
    if (siteId.value !== 'all') query = query.eq('site_id', siteId.value)
    const { data, error } = await query
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id, status, siteId, limit], default: () => [] },
)

const visible = computed(() => comments.value.slice(0, limit.value))
const hasMore = computed(() => comments.value.length > limit.value)

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

async function moderate(id: string, next: ModerationStatus) {
  const { error } = await supabase.from('comments').update({ status: next }).eq('id', id)
  if (error) {
    toast.add({ title: 'Could not update the comment', description: error.message, color: 'error' })
    return
  }
  await Promise.all([refresh(), refreshPendingComments()])
}

async function remove(id: string) {
  if (!confirm('Delete this comment and its replies for good?')) return
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) {
    toast.add({ title: 'Could not delete the comment', description: error.message, color: 'error' })
    return
  }
  await Promise.all([refresh(), refreshPendingComments()])
}

const actions: { status: ModerationStatus, label: string, icon: string, color: 'success' | 'neutral' | 'warning' }[] = [
  { status: 'approved', label: 'Publish', icon: 'i-lucide-check', color: 'success' },
  { status: 'rejected', label: 'Reject', icon: 'i-lucide-x', color: 'neutral' },
  { status: 'spam', label: 'Spam', icon: 'i-lucide-shield-alert', color: 'warning' },
]
</script>

<template>
  <UContainer class="space-y-6 py-8">
    <div>
      <h1 class="text-2xl font-semibold">
        Comments
      </h1>
      <p class="text-sm text-muted">
        Approve comments posted with the comments widget. Rules for automatic approval are set on each widget.
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <UTabs
        v-model="status"
        :items="statusTabs"
        :content="false"
        size="sm"
      />
      <USelect
        v-model="siteId"
        :items="siteOptions"
        aria-label="Site"
        class="w-48"
      />
    </div>

    <UEmpty
      v-if="!visible.length && loading !== 'pending'"
      icon="i-lucide-message-square"
      :title="status === 'pending' ? 'Nothing to review' : 'No comments'"
      :description="status === 'pending' ? 'New comments that need approval will show up here.' : undefined"
    />

    <div class="space-y-4">
      <UCard
        v-for="comment in visible"
        :key="comment.id"
      >
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-medium">{{ comment.is_anonymous ? 'Anonymous visitor' : comment.author_name }}</span>
            <UBadge
              v-if="comment.is_anonymous"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              Anonymous
            </UBadge>
            <UBadge
              v-if="comment.parent_id"
              color="neutral"
              variant="outline"
              size="sm"
            >
              Reply
            </UBadge>
            <span class="text-muted">{{ dateFormat.format(new Date(comment.created_at)) }}</span>
            <span
              v-if="comment.edited_at"
              class="text-muted"
            >(edited)</span>
          </div>
          <p class="text-sm whitespace-pre-wrap break-words">
            {{ comment.body }}
          </p>
          <p class="text-xs text-muted">
            {{ siteNames.get(comment.site_id) ?? 'Site' }} ·
            <ULink
              v-if="comment.page_url"
              :to="comment.page_url"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >{{ comment.page_id }}</ULink>
            <span v-else>{{ comment.page_id }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <template
              v-for="action in actions"
              :key="action.status"
            >
              <UButton
                v-if="action.status !== comment.status"
                :icon="action.icon"
                :color="action.color"
                variant="soft"
                size="sm"
                loading-auto
                @click="moderate(comment.id, action.status)"
              >
                {{ action.label }}
              </UButton>
            </template>
            <UButton
              v-if="canDelete"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              loading-auto
              @click="remove(comment.id)"
            >
              Delete
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <UButton
      v-if="hasMore"
      color="neutral"
      variant="outline"
      @click="limit += PAGE_SIZE"
    >
      Load more
    </UButton>
  </UContainer>
</template>
