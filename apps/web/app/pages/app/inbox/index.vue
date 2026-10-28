<template>
  <UDashboardPanel
    id="inbox-empty"
    class="hidden lg:flex"
  >
    <template #body>
      <UEmpty
        icon="i-lucide-mail-open"
        title="Select a conversation"
        description="Pick a conversation on the left to read it and reply."
        variant="naked"
        class="my-auto"
      />
    </template>
  </UDashboardPanel>
</template>
