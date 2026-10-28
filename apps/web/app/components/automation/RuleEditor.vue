<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  autoReplyFormSchema,
  fillTemplate,
  parseAutoReplyConditions,
  parseContactWidgetConfig,
  renderMarkdown,
  type AutoReplyForm,
} from '@staticdesk/core'
import type { RuleSite, StoredAutoReply } from '~/utils/auto-reply'

const props = defineProps<{
  workspaceId: string
  /** Rule to edit; null creates one. */
  rule: StoredAutoReply | null
  sites: RuleSite[]
  members: { user_id: string, email: string }[]
  nextPosition: number
}>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { required: true })

const supabase = useSupabaseClient()
const toast = useToast()

function initialState(rule: StoredAutoReply | null): AutoReplyForm {
  const conditions = parseAutoReplyConditions(rule?.conditions) ?? { widgetIds: [], keywords: [], field: null }
  return {
    name: rule?.name ?? '',
    enabled: rule?.enabled ?? true,
    trigger: rule?.trigger ?? 'new_thread',
    siteId: rule?.site_id ?? null,
    conditions,
    sendEmail: rule?.send_email ?? true,
    subject: rule?.subject ?? 'We received your message',
    body: rule?.body ?? 'Hi {{name|there}},\n\nThanks for reaching out to {{site}}. We usually reply within one business day.',
    delayMinutes: rule?.delay_minutes ?? 0,
    labels: rule?.add_labels ?? [],
    assigneeId: rule?.assignee_id ?? null,
  }
}

const state = reactive<AutoReplyForm>(initialState(props.rule))
const matchField = ref(Boolean(state.conditions.field))
const tab = ref('write')

watch(open, (value) => {
  if (!value) return
  Object.assign(state, initialState(props.rule))
  matchField.value = Boolean(state.conditions.field)
  tab.value = 'write'
})

// Selects cannot hold null: 'all' and 'nobody' stand for it.
const siteModel = computed({
  get: () => state.siteId ?? 'all',
  set: (value: string) => {
    state.siteId = value === 'all' ? null : value
    state.conditions.widgetIds = state.conditions.widgetIds.filter(id => forms.value.some(form => form.value === id))
  },
})
const assigneeModel = computed({
  get: () => state.assigneeId ?? 'nobody',
  set: (value: string) => state.assigneeId = value === 'nobody' ? null : value,
})

const triggerItems = [
  { label: 'Every new conversation', value: 'new_thread' },
  { label: 'Outside opening hours', value: 'outside_hours' },
]
const siteItems = computed(() => [{ label: 'All sites', value: 'all' }, ...props.sites.map(site => ({ label: site.name, value: site.id }))])
const assigneeItems = computed(() => [
  { label: 'Nobody', value: 'nobody' },
  ...props.members.map(member => ({ label: member.email, value: member.user_id })),
])

const contactWidgets = computed(() => props.sites
  .filter(site => !state.siteId || site.id === state.siteId)
  .flatMap(site => site.widgets.filter(widget => widget.kind === 'contact').map(widget => ({ ...widget, site: site.name }))))
const forms = computed(() => contactWidgets.value.map(widget => ({
  label: state.siteId ? widget.name : `${widget.name} (${widget.site})`,
  value: widget.id,
})))

// Custom fields of the selected forms (or of every form), to match a value.
const fieldItems = computed(() => {
  const widgets = state.conditions.widgetIds.length
    ? contactWidgets.value.filter(widget => state.conditions.widgetIds.includes(widget.id))
    : contactWidgets.value
  const fields = new Map<string, string>()
  for (const widget of widgets) {
    for (const field of parseContactWidgetConfig(widget.config).fields) {
      if (!fields.has(field.id)) fields.set(field.id, `${field.label} (${field.id})`)
    }
  }
  return [...fields].map(([value, label]) => ({ label, value }))
})

watch(matchField, (value) => {
  state.conditions.field = value ? (state.conditions.field ?? { id: fieldItems.value[0]?.value ?? '', value: '' }) : null
})

const delayItems = [
  { label: 'Right away', value: 0 },
  { label: 'After 5 minutes', value: 5 },
  { label: 'After 15 minutes', value: 15 },
  { label: 'After 1 hour', value: 60 },
  { label: 'After 4 hours', value: 240 },
  { label: 'After 1 day', value: 1440 },
]

const sampleSite = computed(() => props.sites.find(site => site.id === state.siteId)?.name ?? props.sites[0]?.name ?? 'Your site')
const sample = computed(() => ({ name: 'Ada', email: 'ada@example.com', site: sampleSite.value }))
const previewSubject = computed(() => fillTemplate(state.subject, sample.value))
const previewHtml = computed(() => renderMarkdown(state.body, { variable: placeholder => fillTemplate(placeholder, sample.value) }))

async function save(event: FormSubmitEvent<AutoReplyForm>) {
  const rule = event.data
  const values = {
    name: rule.name,
    enabled: rule.enabled,
    trigger: rule.trigger,
    site_id: rule.siteId,
    conditions: rule.conditions,
    send_email: rule.sendEmail,
    subject: rule.subject || null,
    body: rule.body || null,
    delay_minutes: rule.delayMinutes,
    add_labels: rule.labels,
    assignee_id: rule.assigneeId,
  }
  const { error } = props.rule
    ? await supabase.from('auto_replies').update(values).eq('id', props.rule.id)
    : await supabase.from('auto_replies').insert({ ...values, workspace_id: props.workspaceId, position: props.nextPosition })
  if (error) {
    toast.add({ title: 'Could not save the rule', description: error.message, color: 'error' })
    return
  }
  open.value = false
  emit('saved')
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="rule ? 'Edit rule' : 'New rule'"
    description="Rules run on every new conversation from your contact forms."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UForm
        :schema="autoReplyFormSchema"
        :state="state"
        class="space-y-6"
        @submit="save"
      >
        <UFormField
          label="Name"
          name="name"
        >
          <UInput
            v-model="state.name"
            placeholder="Acknowledgement"
            class="w-full"
          />
        </UFormField>

        <section class="space-y-4">
          <h3 class="font-medium">
            When
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Trigger"
              name="trigger"
            >
              <USelect
                v-model="state.trigger"
                :items="triggerItems"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Site"
              name="siteId"
            >
              <USelect
                v-model="siteModel"
                :items="siteItems"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField
            label="Forms"
            description="Leave empty for every contact form."
            name="conditions.widgetIds"
          >
            <USelectMenu
              v-model="state.conditions.widgetIds"
              :items="forms"
              value-key="value"
              multiple
              placeholder="Every form"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Keywords"
            description="The message contains any of these words. Press Enter after each one."
            name="conditions.keywords"
          >
            <UInputTags
              v-model="state.conditions.keywords"
              placeholder="refund, invoice…"
              class="w-full"
            />
          </UFormField>
          <div class="space-y-3">
            <USwitch
              v-model="matchField"
              label="A custom field has a given value"
            />
            <div
              v-if="state.conditions.field"
              class="grid gap-4 sm:grid-cols-2"
            >
              <UFormField
                label="Field"
                name="conditions.field.id"
              >
                <USelect
                  v-if="fieldItems.length"
                  v-model="state.conditions.field.id"
                  :items="fieldItems"
                  class="w-full"
                />
                <UInput
                  v-else
                  v-model="state.conditions.field.id"
                  placeholder="field_name"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Value"
                name="conditions.field.value"
              >
                <UInput
                  v-model="state.conditions.field.value"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </section>

        <USeparator />

        <section class="space-y-4">
          <h3 class="font-medium">
            Then
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Add labels"
              name="labels"
            >
              <UInputTags
                v-model="state.labels"
                placeholder="billing"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Assign to"
              description="Only when nobody is assigned yet."
              name="assigneeId"
            >
              <USelect
                v-model="assigneeModel"
                :items="assigneeItems"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField name="sendEmail">
            <USwitch
              v-model="state.sendEmail"
              label="Email the visitor"
              description="One auto-reply per conversation: the first matching rule wins, and out-of-hours rules come first when you are closed."
            />
          </UFormField>

          <template v-if="state.sendEmail">
            <UFormField
              label="Send"
              name="delayMinutes"
              description="A delayed reply is not sent if someone answers first."
            >
              <USelect
                v-model="state.delayMinutes"
                :items="delayItems"
                class="w-48"
              />
            </UFormField>
            <UFormField
              label="Subject"
              name="subject"
            >
              <UInput
                v-model="state.subject"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Message"
              name="body"
            >
              <template #description>
                Markdown: **bold**, *italic*, [links](https://…), lists. Variables:
                <code v-pre>{{name}}</code>, <code v-pre>{{email}}</code>, <code v-pre>{{site}}</code>;
                <code v-pre>{{name|there}}</code> falls back to "there".
              </template>
              <UTabs
                v-model="tab"
                :items="[{ label: 'Write', value: 'write', slot: 'write' }, { label: 'Preview', value: 'preview', slot: 'preview' }]"
                variant="link"
                size="sm"
                class="w-full"
              >
                <template #write>
                  <UTextarea
                    v-model="state.body"
                    :rows="8"
                    autoresize
                    class="w-full"
                  />
                </template>
                <template #preview>
                  <div class="space-y-3 rounded-md border border-default p-4">
                    <p class="text-sm">
                      <span class="text-muted">Subject:</span> {{ previewSubject }}
                    </p>
                    <!-- renderMarkdown escapes everything it does not render. -->
                    <!-- eslint-disable vue/no-v-html -->
                    <div
                      class="auto-reply-preview text-sm leading-relaxed"
                      v-html="previewHtml"
                    />
                    <!-- eslint-enable vue/no-v-html -->
                  </div>
                </template>
              </UTabs>
            </UFormField>
          </template>
        </section>

        <USeparator />

        <div class="flex items-center justify-between gap-2">
          <USwitch
            v-model="state.enabled"
            label="Enabled"
          />
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="open = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              loading-auto
            >
              Save rule
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </USlideover>
</template>

<style scoped>
.auto-reply-preview :deep(p),
.auto-reply-preview :deep(ul),
.auto-reply-preview :deep(ol),
.auto-reply-preview :deep(blockquote) {
  margin-block: 0.5rem;
}
.auto-reply-preview :deep(ul) {
  list-style: disc;
  padding-inline-start: 1.25rem;
}
.auto-reply-preview :deep(ol) {
  list-style: decimal;
  padding-inline-start: 1.25rem;
}
.auto-reply-preview :deep(blockquote) {
  border-inline-start: 3px solid var(--ui-border);
  padding-inline-start: 0.75rem;
  color: var(--ui-text-muted);
}
.auto-reply-preview :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
}
.auto-reply-preview :deep(h2),
.auto-reply-preview :deep(h3),
.auto-reply-preview :deep(h4) {
  font-weight: 600;
  margin-block: 0.75rem 0.25rem;
}
</style>
