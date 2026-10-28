<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'
import { inboxFiltersSchema, type InboxFilters } from '@staticdesk/core'

definePageMeta({ layout: 'dashboard', panels: true })
useSeoMeta({ title: 'Inbox · StaticDesk', robots: 'noindex' })

const PAGE_SIZE = 50

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { current } = useWorkspaces()
const { members, memberName } = useWorkspaceMembers()

// Serialized so that opening a conversation (same query) does not refetch the list.
const filtersKey = computed(() => JSON.stringify(inboxFiltersSchema.parse(route.query)))
const filters = computed(() => JSON.parse(filtersKey.value) as InboxFilters)
const selectedId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))

/** Updates the filters in the URL; empty values are removed. */
function setFilters(patch: Partial<Record<keyof InboxFilters, string | undefined>>) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    if (typeof value === 'string' && value && value !== 'all-values') query[key] = value
  }
  router.replace({ path: route.path, query })
}

const search = ref(filters.value.q ?? '')
watchDebounced(search, q => setFilters({ q: q.trim() || undefined }), { debounce: 300 })

const limit = ref(PAGE_SIZE)
watch(filtersKey, () => (limit.value = PAGE_SIZE))

const { data: threads, refresh, status } = await useAsyncData(
  'inbox-threads',
  async () => {
    if (!current.value) return []
    const { status, site, assignee, label, q } = filters.value
    const { data, error } = await supabase
      .rpc('search_threads', {
        ws: current.value.id,
        query: q,
        statuses: status === 'all' ? undefined : [status],
        site,
        assignee: assignee === 'me' ? user.value?.sub : assignee === 'unassigned' ? undefined : assignee,
        unassigned: assignee === 'unassigned',
        label,
      })
      .select('id, subject, status, labels, assignee_id, last_message_at, contacts(email, name), sites(name)')
      .limit(limit.value + 1)
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id, filtersKey, limit], default: () => [] },
)

const visibleThreads = computed(() => threads.value.slice(0, limit.value))
const hasMore = computed(() => threads.value.length > limit.value)

const { data: sites } = await useAsyncData(
  'inbox-sites',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase.from('sites').select('id, name').eq('workspace_id', current.value.id).order('name')
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id], default: () => [] },
)

const { data: labels, refresh: refreshLabels } = await useAsyncData(
  'inbox-labels',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase.rpc('workspace_thread_labels', { ws: current.value.id })
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id], default: () => [] },
)

const statusTabs = [
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'All', value: 'all' },
]

// 'all-values' stands for "no filter": select items cannot have an empty value.
const siteItems = computed(() => [
  { label: 'All sites', value: 'all-values' },
  ...sites.value.map(site => ({ label: site.name, value: site.id })),
])
const assigneeItems = computed(() => [
  { label: 'Anyone', value: 'all-values' },
  { label: 'Me', value: 'me' },
  { label: 'Unassigned', value: 'unassigned' },
  ...members.value
    .filter(member => member.user_id !== user.value?.sub)
    .map(member => ({ label: member.email, value: member.user_id })),
])
const labelItems = computed(() => [
  { label: 'All labels', value: 'all-values' },
  ...labels.value.map(label => ({ label, value: label })),
])

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
function ago(date: string) {
  const minutes = Math.round((new Date(date).getTime() - Date.now()) / 60000)
  if (minutes > -60) return relativeTime.format(minutes, 'minute')
  if (minutes > -60 * 24) return relativeTime.format(Math.round(minutes / 60), 'hour')
  return relativeTime.format(Math.round(minutes / 60 / 24), 'day')
}

// Live updates: refresh the list when a thread of the workspace changes.
let channel: RealtimeChannel | null = null
const refreshSoon = useDebounceFn(() => Promise.all([refresh(), refreshLabels()]), 500)

function subscribe(workspaceId: string) {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel(`inbox-threads:${workspaceId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'threads', filter: `workspace_id=eq.${workspaceId}` }, () => refreshSoon())
    .subscribe()
}

onMounted(() => {
  watch(() => current.value?.id, id => id && subscribe(id), { immediate: true })
})
onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})

provide('inbox:refresh', () => Promise.all([refresh(), refreshLabels()]))
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <UDashboardPanel
      id="inbox-list"
      :default-size="28"
      :min-size="22"
      :max-size="40"
      resizable
      :class="{ 'max-lg:hidden': selectedId }"
    >
      <template #header>
        <UDashboardNavbar title="Inbox">
          <template #trailing>
            <UBadge
              :label="hasMore ? `${limit}+` : visibleThreads.length"
              variant="subtle"
            />
          </template>
        </UDashboardNavbar>

        <div class="space-y-2 border-b border-default px-4 py-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search messages, subjects, contacts"
            aria-label="Search the inbox"
            class="w-full"
          />
          <UTabs
            :items="statusTabs"
            :model-value="filters.status"
            :content="false"
            size="xs"
            class="w-full"
            @update:model-value="value => setFilters({ status: String(value) })"
          />
          <div class="grid grid-cols-3 gap-2">
            <USelect
              :model-value="filters.site ?? 'all-values'"
              :items="siteItems"
              size="xs"
              aria-label="Site"
              @update:model-value="value => setFilters({ site: String(value) })"
            />
            <USelect
              :model-value="filters.assignee ?? 'all-values'"
              :items="assigneeItems"
              size="xs"
              aria-label="Assignee"
              @update:model-value="value => setFilters({ assignee: String(value) })"
            />
            <USelect
              :model-value="filters.label ?? 'all-values'"
              :items="labelItems"
              size="xs"
              aria-label="Label"
              @update:model-value="value => setFilters({ label: String(value) })"
            />
          </div>
        </div>
      </template>

      <template #body>
        <UEmpty
          v-if="!visibleThreads.length"
          icon="i-lucide-inbox"
          :title="status === 'pending' ? 'Loading…' : 'No conversation'"
          :description="filters.q ? 'Nothing matches your search.' : 'New messages from your sites will show up here.'"
          variant="naked"
        />

        <nav
          v-else
          aria-label="Conversations"
          class="-mx-4 -my-4 divide-y divide-default sm:-mx-6"
        >
          <NuxtLink
            v-for="thread in visibleThreads"
            :key="thread.id"
            :to="{ path: `/app/inbox/${thread.id}`, query: route.query }"
            class="block border-l-2 px-4 py-3 text-sm transition-colors sm:px-6"
            :class="thread.id === selectedId ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-elevated/50'"
            :aria-current="thread.id === selectedId ? 'page' : undefined"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-medium">
                {{ thread.contacts?.name || thread.contacts?.email }}
              </span>
              <span class="shrink-0 text-xs text-muted">{{ ago(thread.last_message_at) }}</span>
            </div>
            <p class="truncate text-toned">
              {{ thread.subject || '(no subject)' }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
              <span>{{ thread.sites?.name }}</span>
              <UBadge
                v-if="filters.status === 'all'"
                :label="thread.status"
                :color="thread.status === 'open' ? 'primary' : thread.status === 'pending' ? 'warning' : 'neutral'"
                variant="subtle"
                size="sm"
              />
              <UBadge
                v-for="label in thread.labels"
                :key="label"
                :label="label"
                color="neutral"
                variant="outline"
                size="sm"
              />
              <span
                v-if="thread.assignee_id"
                class="ms-auto inline-flex items-center gap-1"
              >
                <UIcon name="i-lucide-user" />
                {{ thread.assignee_id === user?.sub ? 'You' : memberName(thread.assignee_id) }}
              </span>
            </div>
          </NuxtLink>

          <div
            v-if="hasMore"
            class="p-4 text-center"
          >
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              :loading="status === 'pending'"
              @click="limit += PAGE_SIZE"
            >
              Load more
            </UButton>
          </div>
        </nav>
      </template>
    </UDashboardPanel>

    <NuxtPage />
  </div>
</template>
