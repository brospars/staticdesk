<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { workspaces, current, select } = useWorkspaces()

const links = computed<NavigationMenuItem[][]>(() => [[
  { label: 'Inbox', icon: 'i-lucide-inbox', to: '/app/inbox' },
  { label: 'Sites', icon: 'i-lucide-globe', to: '/app/sites' },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    defaultOpen: route.path.startsWith('/app/settings'),
    children: [
      { label: 'Members', to: '/app/settings/members' },
      { label: 'Auto-replies', to: '/app/settings/auto-replies' },
      { label: 'Notifications', to: '/app/settings/notifications' },
      { label: 'Saved replies', to: '/app/settings/saved-replies' },
      { label: 'Sending domain', to: '/app/settings/sending-domain' },
    ],
  },
]])

const workspaceItems = computed<DropdownMenuItem[][]>(() => [
  (workspaces.value ?? []).map(workspace => ({
    label: workspace.name,
    icon: workspace.id === current.value?.id ? 'i-lucide-check' : undefined,
    onSelect: () => select(workspace.id),
  })),
  [{ label: 'New workspace', icon: 'i-lucide-plus', to: '/app/onboarding' }],
])

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      collapsible
      resizable
      :default-size="15"
      :min-size="12"
      :max-size="20"
      class="bg-elevated/25"
    >
      <template #header="{ collapsed }">
        <UDropdownMenu
          :items="workspaceItems"
          :content="{ align: 'start' }"
          class="w-full"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-building-2"
            :label="collapsed ? undefined : current?.name ?? 'StaticDesk'"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            block
            class="justify-start"
          />
        </UDropdownMenu>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex w-full items-center justify-between gap-2">
          <span
            v-if="!collapsed"
            class="truncate text-sm text-muted"
          >{{ user?.email }}</span>
          <UTooltip text="Sign out">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              aria-label="Sign out"
              @click="signOut"
            />
          </UTooltip>
        </div>
      </template>
    </UDashboardSidebar>

    <slot v-if="route.meta.panels" />
    <UDashboardPanel
      v-else
      id="page"
    >
      <template #header>
        <UDashboardNavbar
          class="lg:hidden"
          title="StaticDesk"
        />
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
