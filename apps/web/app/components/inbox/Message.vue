<script setup lang="ts">
import type { Json } from '@staticdesk/core'

const props = defineProps<{
  message: {
    direction: 'inbound' | 'outbound' | 'note'
    body: string
    created_at: string
    metadata: Json
  }
  /** Contact for inbound messages, team member otherwise. */
  author: string
  /** Email address of the contact, to flag replies sent from another address. */
  contactEmail?: string
}>()

interface Metadata {
  fields?: { label: string, value: string }[]
  pageUrl?: string
  attachments?: string[]
  source?: string
  from?: string
}

const metadata = computed(() => {
  const value = props.message.metadata
  return (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Metadata
})

const styles = {
  inbound: 'bg-elevated/50 border-default',
  outbound: 'bg-primary/5 border-primary/25 ms-8',
  note: 'bg-warning/10 border-warning/30 border-dashed',
} as const

const time = computed(() => new Date(props.message.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
const otherSender = computed(() => metadata.value.from && props.contactEmail && metadata.value.from !== props.contactEmail)
</script>

<template>
  <article
    class="rounded-lg border p-4"
    :class="styles[message.direction]"
  >
    <header class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <UIcon
        :name="message.direction === 'note' ? 'i-lucide-sticky-note' : message.direction === 'outbound' ? 'i-lucide-reply' : 'i-lucide-mail'"
        class="text-muted"
      />
      <span class="font-medium">{{ author }}</span>
      <UBadge
        v-if="message.direction === 'note'"
        label="Internal note"
        color="warning"
        variant="subtle"
        size="sm"
      />
      <UBadge
        v-if="metadata.source === 'email'"
        label="Email"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <time
        class="ms-auto text-xs text-muted"
        :datetime="message.created_at"
      >{{ time }}</time>
    </header>

    <p
      v-if="otherSender"
      class="mb-2 text-xs text-warning"
    >
      Sent from {{ metadata.from }}
    </p>

    <p class="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {{ message.body }}
    </p>

    <dl
      v-if="metadata.fields?.length || metadata.pageUrl"
      class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-default pt-3 text-xs"
    >
      <template
        v-for="field in metadata.fields"
        :key="field.label"
      >
        <dt class="text-muted">
          {{ field.label }}
        </dt>
        <dd class="break-words">
          {{ field.value }}
        </dd>
      </template>
      <template v-if="metadata.pageUrl">
        <dt class="text-muted">
          Page
        </dt>
        <dd class="truncate">
          <ULink
            :to="metadata.pageUrl"
            target="_blank"
            rel="noopener noreferrer nofollow"
            external
          >
            {{ metadata.pageUrl }}
          </ULink>
        </dd>
      </template>
    </dl>

    <p
      v-if="metadata.attachments?.length"
      class="mt-2 text-xs text-muted"
    >
      <UIcon name="i-lucide-paperclip" />
      Attachments not imported: {{ metadata.attachments.join(', ') }}
    </p>
  </article>
</template>
