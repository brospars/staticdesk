<script setup lang="ts">
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Sign in · StaticDesk', robots: 'noindex' })

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const toast = useToast()

const emailSent = ref<string | null>(null)

const schema = z.object({
  email: z.email('Enter a valid email address'),
})
type Schema = z.output<typeof schema>

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'you@example.com',
  required: true,
}]

const callbackUrl = () => new URL('/confirm', window.location.origin).toString()

const providerButtons: Record<string, ButtonProps> = {
  github: { label: 'GitHub', icon: 'i-simple-icons-github' },
  google: { label: 'Google', icon: 'i-simple-icons-google' },
}

const providers = computed<ButtonProps[]>(() =>
  String(config.public.authProviders)
    .split(',')
    .map(name => name.trim())
    .filter((name): name is 'github' | 'google' => name in providerButtons)
    .map(name => ({
      ...providerButtons[name],
      color: 'neutral',
      variant: 'subtle',
      onClick: () => signInWithProvider(name),
    })),
)

async function signInWithProvider(provider: 'github' | 'google') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  })
  if (error) toast.add({ title: 'Sign-in failed', description: error.message, color: 'error' })
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { error } = await supabase.auth.signInWithOtp({
    email: event.data.email,
    options: { emailRedirectTo: callbackUrl() },
  })
  if (error) {
    // Invite-only instances refuse unknown addresses.
    const description = error.code === 'signup_disabled' || error.code === 'otp_disabled'
      ? 'This StaticDesk is invite-only: ask a workspace admin to invite you.'
      : error.message
    toast.add({ title: 'Could not send the link', description, color: 'error' })
    return
  }
  emailSent.value = event.data.email
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <UPageCard class="w-full max-w-md">
      <div
        v-if="emailSent"
        class="space-y-4 text-center"
      >
        <UIcon
          name="i-lucide-mail-check"
          class="size-10 text-primary"
        />
        <h1 class="text-xl font-semibold">
          Check your inbox
        </h1>
        <p class="text-muted">
          We sent a sign-in link to <strong>{{ emailSent }}</strong>.
        </p>
        <UButton
          variant="link"
          @click="emailSent = null"
        >
          Use another email
        </UButton>
      </div>

      <UAuthForm
        v-else
        :schema="schema"
        :fields="fields"
        :providers="providers"
        title="Sign in to StaticDesk"
        description="We will email you a magic link. No password needed."
        icon="i-lucide-inbox"
        :submit="{ label: 'Send magic link' }"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>
