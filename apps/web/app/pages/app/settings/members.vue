<script setup lang="ts">
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import { z } from 'zod'

definePageMeta({ layout: 'dashboard' })

useSeoMeta({ title: 'Members · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const toast = useToast()
const { current } = useWorkspaces()

const canManage = computed(() => current.value?.role === 'owner' || current.value?.role === 'admin')

const { data: members, refresh: refreshMembers } = await useAsyncData(
  'members',
  async () => {
    if (!current.value) return []
    const { data, error } = await supabase.rpc('workspace_members', { ws: current.value.id })
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id] },
)

const { data: invitations, refresh: refreshInvitations } = await useAsyncData(
  'invitations',
  async () => {
    if (!current.value || !canManage.value) return []
    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, role, expires_at')
      .eq('workspace_id', current.value.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  { watch: [() => current.value?.id] },
)

const memberColumns: TableColumn<NonNullable<typeof members.value>[number]>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'joined_at', header: 'Joined', cell: ({ row }) => new Date(row.original.joined_at).toLocaleDateString() },
]

const inviteSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(['admin', 'member']),
})
type InviteInput = z.output<typeof inviteSchema>
const invite = reactive<InviteInput>({ email: '', role: 'member' })
const roleOptions = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
]

async function sendInvite(event: FormSubmitEvent<InviteInput>) {
  if (!current.value) return
  try {
    await $fetch(`/api/workspaces/${current.value.id}/invitations`, { method: 'POST', body: event.data })
    toast.add({ title: 'Invitation sent', description: event.data.email, color: 'success' })
    invite.email = ''
    await refreshInvitations()
  }
  catch (cause) {
    toast.add({
      title: 'Could not send the invitation',
      description: (cause as { statusMessage?: string }).statusMessage,
      color: 'error',
    })
  }
}

async function revoke(id: string) {
  const { error } = await supabase.from('invitations').delete().eq('id', id)
  if (error) {
    toast.add({ title: 'Could not revoke the invitation', description: error.message, color: 'error' })
    return
  }
  await Promise.all([refreshInvitations(), refreshMembers()])
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <div>
      <h1 class="text-2xl font-semibold">
        Members
      </h1>
      <p class="text-muted">
        People who can access {{ current?.name }}.
      </p>
    </div>

    <UPageCard
      v-if="canManage"
      title="Invite a teammate"
      description="They will receive an email with a link to join this workspace."
    >
      <UForm
        :schema="inviteSchema"
        :state="invite"
        class="flex flex-col gap-3 sm:flex-row sm:items-start"
        @submit="sendInvite"
      >
        <UFormField
          name="email"
          class="flex-1"
        >
          <UInput
            v-model="invite.email"
            type="email"
            placeholder="teammate@example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField name="role">
          <USelect
            v-model="invite.role"
            :items="roleOptions"
            class="w-32"
          />
        </UFormField>
        <UButton
          type="submit"
          loading-auto
        >
          Send invite
        </UButton>
      </UForm>

      <ul
        v-if="invitations?.length"
        class="mt-6 divide-y divide-default"
      >
        <li
          v-for="invitation in invitations"
          :key="invitation.id"
          class="flex items-center justify-between py-2 text-sm"
        >
          <span>{{ invitation.email }} <UBadge
            color="neutral"
            variant="subtle"
          >{{ invitation.role }}</UBadge></span>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="revoke(invitation.id)"
          >
            Revoke
          </UButton>
        </li>
      </ul>
    </UPageCard>

    <UTable
      :data="members ?? []"
      :columns="memberColumns"
    />
  </UContainer>
</template>
