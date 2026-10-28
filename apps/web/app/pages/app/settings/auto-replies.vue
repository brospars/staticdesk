<script setup lang="ts">
import { parseAutoReplyConditions, parseOpeningHours } from '@staticdesk/core'
import type { RuleSite, StoredAutoReply } from '~/utils/auto-reply'

definePageMeta({ layout: 'dashboard' })
useSeoMeta({ title: 'Auto-replies · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const toast = useToast()
const { current } = useWorkspaces()
const { members, memberName } = useWorkspaceMembers()

const canEdit = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')

const { data, refresh } = await useAsyncData(
  'auto-replies',
  async () => {
    if (!current.value) return null
    const [rules, sites, workspace] = await Promise.all([
      supabase
        .from('auto_replies')
        .select('id, name, enabled, trigger, site_id, conditions, send_email, subject, body, delay_minutes, add_labels, assignee_id, position')
        .eq('workspace_id', current.value.id)
        .order('position')
        .order('created_at'),
      supabase
        .from('sites')
        .select('id, name, widgets(id, name, kind, config)')
        .eq('workspace_id', current.value.id)
        .order('name'),
      supabase
        .from('workspaces')
        .select('opening_hours, follow_up_hours')
        .eq('id', current.value.id)
        .single(),
    ])
    if (rules.error) throw rules.error
    if (sites.error) throw sites.error
    if (workspace.error) throw workspace.error
    return {
      rules: rules.data,
      sites: sites.data as RuleSite[],
      openingHours: parseOpeningHours(workspace.data.opening_hours),
      followUpHours: workspace.data.follow_up_hours,
    }
  },
  { watch: [() => current.value?.id] },
)

const rules = computed(() => data.value?.rules ?? [])
const siteName = computed(() => new Map(data.value?.sites.map(site => [site.id, site.name])))
const formName = computed(() => new Map(data.value?.sites.flatMap(site => site.widgets.map(widget => [widget.id, widget.name]))))

function summary(rule: StoredAutoReply) {
  const conditions = parseAutoReplyConditions(rule.conditions)
  const when = [
    rule.trigger === 'outside_hours' ? 'a new conversation arrives outside opening hours' : 'a new conversation arrives',
    rule.site_id ? `on ${siteName.value.get(rule.site_id) ?? 'a deleted site'}` : null,
    conditions?.widgetIds.length ? `from ${conditions.widgetIds.map(id => formName.value.get(id) ?? 'a deleted form').join(', ')}` : null,
    conditions?.keywords.length ? `containing ${conditions.keywords.map(keyword => `“${keyword}”`).join(' or ')}` : null,
    conditions?.field ? `where ${conditions.field.id} is “${conditions.field.value}”` : null,
  ].filter(Boolean).join(' ')
  const then = [
    rule.send_email ? `email “${rule.subject}”${rule.delay_minutes ? ` after ${formatDelay(rule.delay_minutes)}` : ''}` : null,
    rule.add_labels.length ? `label ${rule.add_labels.join(', ')}` : null,
    rule.assignee_id ? `assign to ${memberName(rule.assignee_id)}` : null,
  ].filter(Boolean).join(', ')
  return { when, then }
}

function formatDelay(minutes: number) {
  if (minutes % 1440 === 0) return minutes === 1440 ? '1 day' : `${minutes / 1440} days`
  if (minutes % 60 === 0) return minutes === 60 ? '1 hour' : `${minutes / 60} hours`
  return `${minutes} minutes`
}

// Editing ---------------------------------------------------------------------------------

const editorOpen = ref(false)
const editing = ref<StoredAutoReply | null>(null)
const nextPosition = computed(() => Math.max(-1, ...rules.value.map(rule => rule.position)) + 1)

function edit(rule: StoredAutoReply | null) {
  editing.value = rule
  editorOpen.value = true
}

async function toggle(rule: StoredAutoReply, enabled: boolean) {
  const { error } = await supabase.from('auto_replies').update({ enabled }).eq('id', rule.id)
  if (error) toast.add({ title: 'Could not update the rule', description: error.message, color: 'error' })
  await refresh()
}

/** Moves a rule up or down and renumbers every rule, so positions stay distinct. */
async function move(index: number, offset: -1 | 1) {
  const order = rules.value.map(rule => rule.id)
  const [id] = order.splice(index, 1)
  order.splice(index + offset, 0, id!)
  const results = await Promise.all(order.map((ruleId, position) =>
    supabase.from('auto_replies').update({ position }).eq('id', ruleId)))
  const failed = results.find(result => result.error)
  if (failed?.error) toast.add({ title: 'Could not reorder the rules', description: failed.error.message, color: 'error' })
  await refresh()
}

const deleting = ref<StoredAutoReply | null>(null)
async function remove() {
  if (!deleting.value) return
  const { error } = await supabase.from('auto_replies').delete().eq('id', deleting.value.id)
  if (error) toast.add({ title: 'Could not delete the rule', description: error.message, color: 'error' })
  deleting.value = null
  await refresh()
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          Auto-replies
        </h1>
        <p class="text-muted">
          Acknowledge new messages, answer outside opening hours, and label or assign conversations automatically.
          Rules run in order on every new conversation from your contact forms.
        </p>
      </div>
      <UButton
        v-if="canEdit"
        icon="i-lucide-plus"
        @click="edit(null)"
      >
        New rule
      </UButton>
    </div>

    <UAlert
      v-if="!canEdit"
      icon="i-lucide-lock"
      color="neutral"
      variant="subtle"
      title="Only owners and admins can change auto-replies."
    />

    <UEmpty
      v-if="!rules.length"
      icon="i-lucide-bot"
      title="No rule yet"
      description="Start with an acknowledgement so visitors know their message arrived."
      variant="naked"
    />

    <div class="grid gap-3">
      <UPageCard
        v-for="(rule, index) in rules"
        :key="rule.id"
        :class="{ 'opacity-60': !rule.enabled }"
      >
        <div class="flex flex-wrap items-start gap-4">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ rule.name }}</span>
              <UBadge
                v-if="rule.trigger === 'outside_hours'"
                label="Out of office"
                color="warning"
                variant="subtle"
                size="sm"
              />
              <UBadge
                v-if="!rule.enabled"
                label="Off"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </div>
            <p class="text-sm text-muted">
              <span class="font-medium text-default">When</span> {{ summary(rule).when }}
            </p>
            <p class="text-sm text-muted">
              <span class="font-medium text-default">Then</span> {{ summary(rule).then }}
            </p>
          </div>
          <div
            v-if="canEdit"
            class="flex items-center gap-1"
          >
            <USwitch
              :model-value="rule.enabled"
              :aria-label="rule.enabled ? 'Turn off' : 'Turn on'"
              class="me-2"
              @update:model-value="value => toggle(rule, value)"
            />
            <UButton
              icon="i-lucide-arrow-up"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Move up"
              :disabled="index === 0"
              @click="move(index, -1)"
            />
            <UButton
              icon="i-lucide-arrow-down"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Move down"
              :disabled="index === rules.length - 1"
              @click="move(index, 1)"
            />
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit"
              @click="edit(rule)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Delete"
              @click="deleting = rule"
            />
          </div>
        </div>
      </UPageCard>
    </div>

    <AutomationOpeningHoursCard
      v-if="current && data"
      :key="current.id"
      :workspace-id="current.id"
      :opening-hours="data.openingHours"
      :follow-up-hours="data.followUpHours"
      :can-edit="canEdit"
      @saved="refresh"
    />

    <AutomationRuleEditor
      v-if="current && data"
      v-model:open="editorOpen"
      :workspace-id="current.id"
      :rule="editing"
      :sites="data.sites"
      :members="members"
      :next-position="nextPosition"
      @saved="refresh"
    />

    <UModal
      :open="deleting !== null"
      title="Delete this rule?"
      :description="deleting ? `“${deleting.name}” stops running. Scheduled auto-replies of this rule are cancelled.` : undefined"
      @update:open="value => !value && (deleting = null)"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="deleting = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            loading-auto
            @click="remove"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
