<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Feedback · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const { current } = useWorkspaces()

const days = ref('30')
const siteId = ref('all')
const periodOptions = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'All time', value: 'all' },
]
const since = computed(() => days.value === 'all' ? undefined : new Date(Date.now() - Number(days.value) * 86_400_000).toISOString())

const { data: sites } = await useAsyncData(
  'feedback-sites',
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

const { data: pages, status } = await useAsyncData(
  'feedback-pages',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase.rpc('page_feedback', {
      ws: current.value.id,
      site: siteId.value === 'all' ? undefined : siteId.value,
      since: since.value,
    })
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id, siteId, days], default: () => [] },
)

const { data: comments } = await useAsyncData(
  'feedback-comments',
  async () => {
    if (!current.value) return []
    let query = supabase
      .from('reactions')
      .select('id, site_id, page_id, kind, comment, created_at')
      .eq('workspace_id', current.value.id)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (siteId.value !== 'all') query = query.eq('site_id', siteId.value)
    if (since.value) query = query.gte('created_at', since.value)
    const { data, error } = await query
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id, siteId, days], default: () => [] },
)

const totals = computed(() => {
  const helpful = pages.value.reduce((sum, page) => sum + page.helpful, 0)
  const unhelpful = pages.value.reduce((sum, page) => sum + page.unhelpful, 0)
  return { helpful, unhelpful, score: score(helpful, unhelpful) }
})

/** Share of "yes" votes, as a percentage. */
function score(helpful: number, unhelpful: number) {
  const votes = helpful + unhelpful
  return votes ? Math.round((helpful / votes) * 100) : null
}

function emojis(value: unknown) {
  return Object.entries((value ?? {}) as Record<string, number>).sort(([, a], [, b]) => b - a)
}

// Pages with the most "no" votes first: they need attention.
const sortedPages = computed(() => [...pages.value].sort((a, b) => b.unhelpful - a.unhelpful || b.helpful - a.helpful))

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
</script>

<template>
  <UContainer class="space-y-6 py-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Feedback
        </h1>
        <p class="text-sm text-muted">
          Answers to “Was this page helpful?” and emoji reactions, per page.
        </p>
      </div>
      <div class="flex gap-2">
        <USelect
          v-model="siteId"
          :items="siteOptions"
          aria-label="Site"
          class="w-44"
        />
        <USelect
          v-model="days"
          :items="periodOptions"
          aria-label="Period"
          class="w-36"
        />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard>
        <p class="text-sm text-muted">
          Helpful score
        </p>
        <p class="text-2xl font-semibold">
          {{ totals.score === null ? '—' : `${totals.score}%` }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          Yes
        </p>
        <p class="text-2xl font-semibold">
          {{ totals.helpful }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          No
        </p>
        <p class="text-2xl font-semibold">
          {{ totals.unhelpful }}
        </p>
      </UCard>
    </div>

    <UEmpty
      v-if="!pages.length && status !== 'pending'"
      icon="i-lucide-thumbs-up"
      title="No feedback yet"
      description="Add a reactions widget to your pages from a site's settings."
    />

    <UPageCard
      v-else
      title="Pages"
      description="Pages with the most “no” votes come first."
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="py-2 pr-4 font-medium">
                Page
              </th>
              <th class="py-2 pr-4 font-medium">
                Score
              </th>
              <th class="py-2 pr-4 font-medium">
                Yes
              </th>
              <th class="py-2 pr-4 font-medium">
                No
              </th>
              <th class="py-2 pr-4 font-medium">
                Reactions
              </th>
              <th class="py-2 font-medium">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="page in sortedPages"
              :key="`${page.site_id}${page.page_id}`"
              class="border-t border-default"
            >
              <td class="py-2 pr-4">
                <span class="font-mono">{{ page.page_id }}</span>
                <span
                  v-if="siteId === 'all' && sites.length > 1"
                  class="ml-2 text-muted"
                >{{ siteNames.get(page.site_id) }}</span>
              </td>
              <td class="py-2 pr-4">
                {{ score(page.helpful, page.unhelpful) === null ? '—' : `${score(page.helpful, page.unhelpful)}%` }}
              </td>
              <td class="py-2 pr-4">
                {{ page.helpful }}
              </td>
              <td class="py-2 pr-4">
                {{ page.unhelpful }}
              </td>
              <td class="py-2 pr-4">
                <span
                  v-for="[emoji, count] in emojis(page.emojis)"
                  :key="emoji"
                  class="mr-2 whitespace-nowrap"
                >{{ emoji }} {{ count }}</span>
              </td>
              <td class="py-2">
                {{ page.comments }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UPageCard
      v-if="comments.length"
      title="Latest comments"
      description="What visitors wrote after voting."
    >
      <ul class="space-y-4">
        <li
          v-for="item in comments"
          :key="item.id"
          class="space-y-1"
        >
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <UBadge
              :color="item.kind === 'helpful' ? 'success' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ item.kind === 'helpful' ? 'Yes' : 'No' }}
            </UBadge>
            <span class="font-mono">{{ item.page_id }}</span>
            <span class="text-muted">{{ dateFormat.format(new Date(item.created_at)) }}</span>
          </div>
          <p class="text-sm whitespace-pre-wrap break-words">
            {{ item.comment }}
          </p>
        </li>
      </ul>
    </UPageCard>
  </UContainer>
</template>
