<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  buildEmbedSnippet,
  buildHtmlFormSnippet,
  contactWidgetFormSchema,
  parseContactWidgetConfig,
  type ContactFieldType,
  type ContactWidgetForm,
  type ContactWidgetFormInput,
} from '@staticdesk/core'

useSeoMeta({ title: 'Contact form · StaticDesk', robots: 'noindex' })

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const appUrl = useAppUrl()
const { current } = useWorkspaces()
const { copy } = useClipboard()

const widgetId = String(route.params.id)
const canManage = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')

const { data: widget, refresh } = await useAsyncData(`widget-${widgetId}`, async () => {
  const { data, error } = await supabase
    .from('widgets')
    .select('id, kind, name, config, site_id, sites(name, public_key)')
    .eq('id', widgetId)
    .maybeSingle()
  if (error) throw error
  if (!data || data.kind !== 'contact') throw createError({ statusCode: 404, statusMessage: 'Contact form not found', fatal: true })
  return data
})

// Options of select fields are edited as one option per line.
interface FieldRow {
  key: number
  id: string
  type: ContactFieldType
  label: string
  required: boolean
  placeholder: string
  options: string
}

let nextKey = 0
const fields = ref<FieldRow[]>([])
// Empty texts are saved as null, which means "use the translated default".
const state = reactive({
  name: '',
  title: '',
  description: '',
  buttonLabel: '',
  successMessage: '',
  errorMessage: '',
  redirectUrl: '',
  position: 'bottom-right' as ContactWidgetFormInput['position'],
  nameField: 'optional' as ContactWidgetFormInput['nameField'],
  notifyTeam: true,
})

watch(widget, (value) => {
  if (!value) return
  const config = parseContactWidgetConfig(value.config)
  Object.assign(state, {
    name: value.name,
    title: config.title ?? '',
    description: config.description ?? '',
    buttonLabel: config.buttonLabel ?? '',
    successMessage: config.successMessage ?? '',
    errorMessage: config.errorMessage ?? '',
    redirectUrl: config.redirectUrl ?? '',
    position: config.position,
    nameField: config.nameField,
    notifyTeam: config.notifyTeam,
  })
  fields.value = config.fields.map(field => ({
    key: nextKey++,
    id: field.id,
    type: field.type,
    label: field.label,
    required: field.required,
    placeholder: field.placeholder ?? '',
    options: field.options.join('\n'),
  }))
}, { immediate: true })

const formState = computed<ContactWidgetFormInput>(() => ({
  ...state,
  fields: fields.value.map(field => ({
    id: field.id,
    type: field.type,
    label: field.label,
    required: field.required,
    placeholder: field.placeholder.trim() || null,
    options: field.type === 'select' ? field.options.split('\n').map(option => option.trim()).filter(Boolean) : [],
  })),
}))

const typeOptions = [
  { label: 'Short text', value: 'text' },
  { label: 'Long text', value: 'textarea' },
  { label: 'Choice list', value: 'select' },
  { label: 'Checkbox', value: 'checkbox' },
]
const nameOptions = [
  { label: 'Optional', value: 'optional' },
  { label: 'Required', value: 'required' },
  { label: 'Hidden', value: 'hidden' },
]
const positionOptions = [
  { label: 'Bottom right', value: 'bottom-right' },
  { label: 'Bottom left', value: 'bottom-left' },
]

/** Field names derived from labels: "Company size" → "company_size". */
function fieldIdFrom(label: string) {
  const base = label.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^[^a-z]+|_+$/g, '').slice(0, 40)
  return ['name', 'email', 'message'].includes(base) ? `${base}_2` : base
}

function onLabelInput(field: FieldRow, label: string) {
  // Keep the name in sync until it has been edited by hand.
  if (!field.id || field.id === fieldIdFrom(field.label)) field.id = fieldIdFrom(label)
  field.label = label
}

function addField() {
  fields.value.push({ key: nextKey++, id: '', type: 'text', label: '', required: false, placeholder: '', options: '' })
}

function moveField(index: number, offset: number) {
  const [field] = fields.value.splice(index, 1)
  fields.value.splice(index + offset, 0, field!)
}

async function save(event: FormSubmitEvent<ContactWidgetForm>) {
  const { name, ...config } = event.data
  // Keep keys this form does not edit.
  const stored = { ...(widget.value?.config as Record<string, unknown> | null), ...config }
  const { error } = await supabase.from('widgets').update({ name, config: stored }).eq('id', widgetId)
  if (error) {
    toast.add({ title: 'Could not save the form', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Form saved', description: 'Widgets pick up changes within a minute.', color: 'success' })
  await refresh()
}

const widgetSnippet = computed(() => widget.value?.sites
  ? buildEmbedSnippet({ scriptUrl: `${appUrl.value}/widget.js`, siteKey: widget.value.sites.public_key, kind: 'contact' })
  : '')
const htmlSnippet = computed(() => {
  const config = contactWidgetFormSchema.safeParse(formState.value)
  return buildHtmlFormSnippet({
    actionUrl: `${appUrl.value}/f/${widgetId}`,
    nameField: state.nameField,
    fields: config.success ? config.data.fields : parseContactWidgetConfig(widget.value?.config).fields,
  })
})
</script>

<template>
  <UContainer
    v-if="widget"
    class="space-y-8 py-12"
  >
    <div>
      <UButton
        :to="`/app/sites/${widget.site_id}`"
        variant="link"
        color="neutral"
        icon="i-lucide-arrow-left"
        class="px-0"
      >
        {{ widget.sites?.name ?? 'Site' }}
      </UButton>
      <h1 class="text-2xl font-semibold">
        {{ widget.name }}
      </h1>
      <p class="text-sm text-muted">
        Contact form
      </p>
    </div>

    <UForm
      :schema="contactWidgetFormSchema"
      :state="formState"
      :disabled="!canManage"
      class="space-y-8"
      @submit="save"
    >
      <UPageCard
        title="Texts"
        description="Leave a text empty to use the default, translated into the visitor's language."
      >
        <div class="space-y-5">
          <UFormField
            label="Name in the dashboard"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              class="w-full"
            />
          </UFormField>
          <div class="grid gap-5 sm:grid-cols-2">
            <UFormField
              label="Title"
              name="title"
            >
              <UInput
                v-model="state.title"
                placeholder="Contact us"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Floating button label"
              name="buttonLabel"
            >
              <UInput
                v-model="state.buttonLabel"
                placeholder="Contact us"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField
            label="Description"
            name="description"
          >
            <UTextarea
              v-model="state.description"
              :rows="2"
              placeholder="Send us a message and we will reply by email."
              class="w-full"
            />
          </UFormField>
          <div class="grid gap-5 sm:grid-cols-2">
            <UFormField
              label="Success message"
              name="successMessage"
            >
              <UTextarea
                v-model="state.successMessage"
                :rows="2"
                placeholder="Thanks! We will get back to you soon."
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Error message"
              name="errorMessage"
            >
              <UTextarea
                v-model="state.errorMessage"
                :rows="2"
                placeholder="Something went wrong. Please try again."
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField
            label="Redirect after sending"
            name="redirectUrl"
            help="Optional. Visitors open this page instead of seeing the success message."
          >
            <UInput
              v-model.trim="state.redirectUrl"
              placeholder="https://docs.acme.dev/thanks"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Floating button position"
            name="position"
          >
            <USelect
              v-model="state.position"
              :items="positionOptions"
              class="w-48"
            />
          </UFormField>
        </div>
      </UPageCard>

      <UPageCard
        title="Fields"
        description="Email and message are always asked. Custom fields appear between them."
      >
        <div class="space-y-4">
          <UFormField
            label="Name"
            name="nameField"
          >
            <USelect
              v-model="state.nameField"
              :items="nameOptions"
              class="w-48"
            />
          </UFormField>

          <div
            v-for="(field, index) in fields"
            :key="field.key"
            class="space-y-4 rounded-md border border-default p-4"
          >
            <div class="grid gap-4 sm:grid-cols-3">
              <UFormField
                label="Label"
                :name="`fields.${index}.label`"
                required
              >
                <UInput
                  :model-value="field.label"
                  class="w-full"
                  @update:model-value="value => onLabelInput(field, String(value))"
                />
              </UFormField>
              <UFormField
                label="Field name"
                :name="`fields.${index}.id`"
                help="Key in webhooks and HTML forms."
              >
                <UInput
                  v-model="field.id"
                  class="w-full font-mono"
                />
              </UFormField>
              <UFormField
                label="Type"
                :name="`fields.${index}.type`"
              >
                <USelect
                  v-model="field.type"
                  :items="typeOptions"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField
              v-if="field.type === 'select'"
              label="Options"
              :name="`fields.${index}.options`"
              help="One per line."
            >
              <UTextarea
                v-model="field.options"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField
              v-else-if="field.type !== 'checkbox'"
              label="Placeholder"
              :name="`fields.${index}.placeholder`"
            >
              <UInput
                v-model="field.placeholder"
                class="w-full"
              />
            </UFormField>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <USwitch
                v-model="field.required"
                :label="field.type === 'checkbox' ? 'Must be checked' : 'Required'"
              />
              <div
                v-if="canManage"
                class="flex gap-1"
              >
                <UButton
                  icon="i-lucide-arrow-up"
                  color="neutral"
                  variant="ghost"
                  aria-label="Move up"
                  :disabled="index === 0"
                  @click="moveField(index, -1)"
                />
                <UButton
                  icon="i-lucide-arrow-down"
                  color="neutral"
                  variant="ghost"
                  aria-label="Move down"
                  :disabled="index === fields.length - 1"
                  @click="moveField(index, 1)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  aria-label="Remove field"
                  @click="fields.splice(index, 1)"
                />
              </div>
            </div>
          </div>

          <UFormField name="fields">
            <UButton
              v-if="canManage"
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              :disabled="fields.length >= 20"
              @click="addField"
            >
              Add a field
            </UButton>
          </UFormField>
        </div>
      </UPageCard>

      <UPageCard
        title="Notifications"
        description="Webhooks (Slack, Discord, custom URL) are set up on the site page."
      >
        <UFormField
          name="notifyTeam"
          description="Each workspace member gets an email; replying to it answers the visitor."
        >
          <USwitch
            v-model="state.notifyTeam"
            label="Email the team about new messages"
          />
        </UFormField>
      </UPageCard>

      <UButton
        v-if="canManage"
        type="submit"
        loading-auto
      >
        Save form
      </UButton>
    </UForm>

    <UPageCard
      title="Install"
      description="Use the widget, or a plain HTML form that works without JavaScript."
    >
      <div class="space-y-6">
        <div class="space-y-2">
          <p class="font-medium">
            Widget
          </p>
          <div class="relative">
            <pre class="overflow-x-auto rounded-md bg-elevated p-3 pr-12 text-xs"><code>{{ widgetSnippet }}</code></pre>
            <UButton
              class="absolute top-1.5 right-1.5"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-copy"
              aria-label="Copy the widget snippet"
              @click="copy(widgetSnippet)"
            />
          </div>
        </div>
        <div class="space-y-2">
          <p class="font-medium">
            Plain HTML form
          </p>
          <p class="text-sm text-muted">
            Style it like the rest of your site. Visitors see a confirmation page, or go to the redirect page.
            Add <code>&lt;input type="hidden" name="_redirect" value="https://…"&gt;</code> to choose it per form.
          </p>
          <div class="relative">
            <pre class="overflow-x-auto rounded-md bg-elevated p-3 pr-12 text-xs"><code>{{ htmlSnippet }}</code></pre>
            <UButton
              class="absolute top-1.5 right-1.5"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-copy"
              aria-label="Copy the HTML form"
              @click="copy(htmlSnippet)"
            />
          </div>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>
