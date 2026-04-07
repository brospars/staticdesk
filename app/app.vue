<template>
  <UApp>
    <main class="min-h-screen bg-neutral-50 text-neutral-900">
      <UContainer class="py-16 sm:py-24">
        <UCard class="mx-auto max-w-3xl">
          <template #header>
            <div class="flex items-center gap-3">
              <UBadge color="success" variant="soft">
                Ready
              </UBadge>
              <span class="text-sm font-medium">FormDesk backend</span>
            </div>
          </template>

          <div class="space-y-4">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
              Form submission API is running.
            </h1>
            <p class="text-base leading-7 text-neutral-600">
              Send a JSON <code>POST</code> request to
              <code>/api/submit/:formId</code> with
              <code>{ name, email, message }</code>.
            </p>
          </div>
        </UCard>
      </UContainer>
    </main>
  </UApp>
</template>
