<script setup lang="ts">
import { followUpHoursSchema, isWithinOpeningHours, openingHoursSchema, WEEKDAYS, type OpeningHours } from '@staticdesk/core'

const props = defineProps<{
  workspaceId: string
  openingHours: OpeningHours
  followUpHours: number | null
  canEdit: boolean
}>()
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const hours = reactive<OpeningHours>(structuredClone(toRaw(props.openingHours)))
const followUp = reactive({ enabled: props.followUpHours !== null, hours: props.followUpHours ?? 24 })

const timezones = Intl.supportedValuesOf('timeZone')
const openNow = computed(() => openingHoursSchema.safeParse(hours).success && isWithinOpeningHours(hours))

function useBrowserTimeZone() {
  hours.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}

async function save() {
  const parsedHours = openingHoursSchema.safeParse(hours)
  const parsedFollowUp = followUpHoursSchema.safeParse(followUp.enabled ? followUp.hours : null)
  const issue = parsedHours.error?.issues[0] ?? parsedFollowUp.error?.issues[0]
  if (!parsedHours.success || !parsedFollowUp.success) {
    toast.add({ title: 'Check the settings', description: issue?.message, color: 'error' })
    return
  }
  const { error } = await supabase
    .from('workspaces')
    .update({ opening_hours: parsedHours.data, follow_up_hours: parsedFollowUp.data })
    .eq('id', props.workspaceId)
  if (error) {
    toast.add({ title: 'Could not save the settings', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Settings saved', color: 'success' })
  emit('saved')
}
</script>

<template>
  <UPageCard
    title="Opening hours and reminders"
    description="Outside opening hours, rules triggered “outside opening hours” send their message instead of the acknowledgement."
  >
    <form
      class="space-y-6"
      @submit.prevent="save"
    >
      <fieldset
        :disabled="!canEdit"
        class="space-y-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <USwitch
            v-model="hours.enabled"
            label="Use opening hours"
          />
          <UBadge
            v-if="hours.enabled"
            :label="openNow ? 'Open now' : 'Closed now'"
            :color="openNow ? 'success' : 'neutral'"
            variant="subtle"
          />
        </div>

        <template v-if="hours.enabled">
          <UFormField label="Time zone">
            <div class="flex flex-wrap gap-2">
              <USelectMenu
                v-model="hours.timezone"
                :items="timezones"
                class="w-72"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                @click="useBrowserTimeZone"
              >
                Use my time zone
              </UButton>
            </div>
          </UFormField>

          <div class="grid gap-2">
            <div
              v-for="(day, index) in hours.days"
              :key="WEEKDAYS[index]"
              class="flex flex-wrap items-center gap-3"
            >
              <USwitch
                v-model="day.enabled"
                :label="WEEKDAYS[index]"
                class="w-36"
              />
              <template v-if="day.enabled">
                <UInput
                  v-model="day.start"
                  type="time"
                  :aria-label="`${WEEKDAYS[index]} opening time`"
                  class="w-32"
                />
                <span class="text-muted">to</span>
                <UInput
                  v-model="day.end"
                  type="time"
                  :aria-label="`${WEEKDAYS[index]} closing time`"
                  class="w-32"
                />
              </template>
              <span
                v-else
                class="text-sm text-muted"
              >Closed</span>
            </div>
          </div>
        </template>

        <USeparator />

        <UFormField
          label="Follow-up reminder"
          description="Email the assignee (or the team, for unassigned conversations) when an open conversation is still waiting for an answer. Members who turned off reply notifications are not reminded."
        >
          <div class="flex flex-wrap items-center gap-3">
            <USwitch
              v-model="followUp.enabled"
              label="Remind after"
            />
            <UInputNumber
              v-model="followUp.hours"
              :min="1"
              :max="720"
              :disabled="!followUp.enabled || !canEdit"
              class="w-32"
            />
            <span class="text-sm text-muted">hours without an answer</span>
          </div>
        </UFormField>
      </fieldset>

      <UButton
        v-if="canEdit"
        type="submit"
        loading-auto
      >
        Save
      </UButton>
    </form>
  </UPageCard>
</template>
