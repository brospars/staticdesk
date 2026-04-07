<script setup lang="ts">
const pricingFeatures = {
  free: [
    "50 submissions / month",
    "1 form widget",
    "Shared inbox",
    "Unlimited team members",
  ],
  pro: [
    "Unlimited submissions",
    "Unlimited form widgets",
    "Shared inbox",
    "Unlimited team members",
    "Priority support",
  ],
}

const year = new Date().getFullYear()
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <header
        class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur"
      >
        <div
          class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        >
          <a href="#" class="flex items-center gap-3 font-semibold tracking-tight">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-950/40"
            >
              F
            </span>
            <span class="text-lg">FormDesk</span>
          </a>

          <nav class="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" class="transition hover:text-white">Features</a>
            <a href="#how-it-works" class="transition hover:text-white">
              How it works
            </a>
            <a href="#pricing" class="transition hover:text-white">Pricing</a>
          </nav>

          <a
            href="#cta"
            class="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Start free
          </a>
        </div>
      </header>

      <main>
        <section class="relative overflow-hidden">
          <div
            class="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.28),transparent_55%),radial-gradient(circle_at_80%_18%,rgba(129,140,248,0.24),transparent_28%)]"
          />
          <div
            class="absolute left-1/2 top-20 h-72 w-72 -translate-x-[130%] rounded-full bg-sky-400/10 blur-3xl"
          />
          <div
            class="absolute right-0 top-12 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div class="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
            <div class="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div
                  class="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100"
                >
                  <span class="h-2 w-2 rounded-full bg-sky-300" />
                  Nuxt 4 widget inbox for lean teams
                </div>

                <h1
                  class="mt-8 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl"
                >
                  Customer messages, captured in one clean embeddable flow.
                </h1>

                <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                  FormDesk gives you a lightweight contact widget, a submission
                  API, and a Neon-backed inbox foundation so you can collect
                  leads and support requests without bolting together five tools.
                </p>

                <div class="mt-10 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#cta"
                    class="inline-flex items-center justify-center rounded-full bg-sky-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-300"
                  >
                    Launch your widget
                  </a>
                  <a
                    href="#how-it-works"
                    class="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                  >
                    See how it works
                  </a>
                </div>

                <dl class="mt-12 grid gap-5 text-sm text-slate-300 sm:grid-cols-3">
                  <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <dt class="font-medium text-slate-400">Install</dt>
                    <dd class="mt-2 text-2xl font-semibold text-white">
                      1 script tag
                    </dd>
                  </div>
                  <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <dt class="font-medium text-slate-400">API</dt>
                    <dd class="mt-2 text-2xl font-semibold text-white">
                      CORS-ready
                    </dd>
                  </div>
                  <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <dt class="font-medium text-slate-400">Storage</dt>
                    <dd class="mt-2 text-2xl font-semibold text-white">
                      Neon + Drizzle
                    </dd>
                  </div>
                </dl>
              </div>

              <div class="relative">
                <div
                  class="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-sky-950/40 backdrop-blur"
                >
                  <div
                    class="rounded-[1.6rem] border border-white/10 bg-slate-900/95 p-6"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm font-medium text-slate-400">
                          Widget preview
                        </p>
                        <p class="mt-1 text-xl font-semibold text-white">
                          Contact sales
                        </p>
                      </div>
                      <span
                        class="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200"
                      >
                        Live
                      </span>
                    </div>

                    <div class="mt-6 space-y-3">
                      <div
                        class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400"
                      >
                        Name
                      </div>
                      <div
                        class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400"
                      >
                        Email
                      </div>
                      <div
                        class="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400"
                      >
                        Tell us what you need...
                      </div>
                    </div>

                    <div
                      class="mt-6 flex items-center justify-between rounded-2xl border border-sky-400/15 bg-sky-400/10 px-4 py-4"
                    >
                      <div>
                        <p class="text-xs uppercase tracking-[0.2em] text-sky-200/80">
                          Destination
                        </p>
                        <p class="mt-1 text-sm font-medium text-white">
                          /api/submit/:formId
                        </p>
                      </div>
                      <button
                        type="button"
                        class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-4 sm:grid-cols-2">
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p class="text-sm font-medium text-slate-400">
                        Shared inbox
                      </p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        Team-friendly triage
                      </p>
                    </div>
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p class="text-sm font-medium text-slate-400">
                        Submission schema
                      </p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        `name`, `email`, `message`
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" class="border-t border-white/10 bg-slate-900/80">
          <div class="mx-auto max-w-6xl px-6 py-24">
            <div class="max-w-2xl">
              <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
                Features
              </p>
              <h2 class="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Everything needed to launch a contact workflow quickly.
              </h2>
            </div>

            <div class="mt-14 grid gap-6 md:grid-cols-3">
              <article class="rounded-3xl border border-white/10 bg-white/5 p-8">
                <div
                  class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200"
                >
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path d="M7 8l-4 4 4 4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M17 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M14 4l-4 16" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <h3 class="mt-5 text-xl font-semibold text-white">Embeddable widget</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  Drop in a single vanilla JS file. The Shadow DOM widget ships
                  a floating trigger, an overlay form, and a clean posting flow.
                </p>
              </article>

              <article class="rounded-3xl border border-white/10 bg-white/5 p-8">
                <div
                  class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200"
                >
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      d="M4 6h16M4 12h16M4 18h10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <h3 class="mt-5 text-xl font-semibold text-white">Submission API</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  Typed request validation, CORS support, and Drizzle inserts let
                  you accept form traffic from hosted sites and embedded installs.
                </p>
              </article>

              <article class="rounded-3xl border border-white/10 bg-white/5 p-8">
                <div
                  class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200"
                >
                  <svg
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      d="M6 10.5A2.5 2.5 0 018.5 8H20v8H8.5A2.5 2.5 0 016 13.5v-3z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path d="M6 10V6h11" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="15.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <h3 class="mt-5 text-xl font-semibold text-white">Database foundation</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  Workspaces, forms, submissions, and users are modeled for a
                  team inbox product on Neon PostgreSQL.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" class="border-t border-white/10">
          <div class="mx-auto max-w-6xl px-6 py-24">
            <div class="max-w-2xl">
              <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
                How it works
              </p>
              <h2 class="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A straightforward path from page embed to stored submission.
              </h2>
            </div>

            <div class="mt-14 grid gap-6 md:grid-cols-3">
              <article class="rounded-3xl border border-white/10 bg-slate-900/80 p-8">
                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Step 1
                </p>
                <h3 class="mt-4 text-xl font-semibold text-white">Embed the widget</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  Load `public/widget.js`, provide a `data-form-id`, and the
                  floating contact trigger appears on any site.
                </p>
              </article>

              <article class="rounded-3xl border border-white/10 bg-slate-900/80 p-8">
                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Step 2
                </p>
                <h3 class="mt-4 text-xl font-semibold text-white">Validate and store</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  FormDesk validates payloads with Zod, resolves the form, and
                  writes submissions into Neon through Drizzle ORM.
                </p>
              </article>

              <article class="rounded-3xl border border-white/10 bg-slate-900/80 p-8">
                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Step 3
                </p>
                <h3 class="mt-4 text-xl font-semibold text-white">Share with the team</h3>
                <p class="mt-3 leading-7 text-slate-300">
                  Each workspace can manage forms, teammates, and incoming
                  customer messages from one inbox foundation.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="pricing" class="border-t border-white/10 bg-slate-900/80">
          <div class="mx-auto max-w-5xl px-6 py-24">
            <div class="mx-auto max-w-2xl text-center">
              <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
                Pricing
              </p>
              <h2 class="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Start with a lean free tier, expand when your inbox grows.
              </h2>
              <p class="mt-4 text-lg leading-8 text-slate-300">
                No seat-based pricing. No setup friction.
              </p>
            </div>

            <div class="mt-14 grid gap-6 md:grid-cols-2">
              <article class="rounded-3xl border border-white/10 bg-slate-950 p-8">
                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Free
                </p>
                <div class="mt-4 flex items-end gap-2">
                  <span class="text-5xl font-semibold text-white">$0</span>
                  <span class="pb-1 text-slate-400">/ month</span>
                </div>
                <p class="mt-4 leading-7 text-slate-300">
                  A strong starting point for prototypes, portfolios, and side
                  projects.
                </p>
                <ul class="mt-8 space-y-3 text-slate-200">
                  <li
                    v-for="feature in pricingFeatures.free"
                    :key="feature"
                    class="flex items-center gap-3"
                  >
                    <span class="h-2.5 w-2.5 rounded-full bg-sky-300" />
                    <span>{{ feature }}</span>
                  </li>
                </ul>
                <a
                  href="#cta"
                  class="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Get started
                </a>
              </article>

              <article
                class="rounded-3xl border border-sky-400/40 bg-gradient-to-b from-sky-400/10 to-slate-950 p-8 shadow-xl shadow-sky-950/20"
              >
                <div class="flex items-center justify-between gap-4">
                  <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-200">
                    Pro
                  </p>
                  <span
                    class="rounded-full bg-sky-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950"
                  >
                    Most popular
                  </span>
                </div>
                <div class="mt-4 flex items-end gap-2">
                  <span class="text-5xl font-semibold text-white">$9</span>
                  <span class="pb-1 text-slate-300">/ month</span>
                </div>
                <p class="mt-4 leading-7 text-slate-200">
                  Built for teams that want an always-on widget and room to grow.
                </p>
                <ul class="mt-8 space-y-3 text-slate-100">
                  <li
                    v-for="feature in pricingFeatures.pro"
                    :key="feature"
                    class="flex items-center gap-3"
                  >
                    <span class="h-2.5 w-2.5 rounded-full bg-sky-300" />
                    <span>{{ feature }}</span>
                  </li>
                </ul>
                <a
                  href="#cta"
                  class="mt-8 inline-flex w-full items-center justify-center rounded-full bg-sky-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  Start pro trial
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="cta" class="border-t border-white/10">
          <div class="mx-auto max-w-4xl px-6 py-24">
            <div
              class="rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-400/12 via-indigo-400/10 to-transparent p-10 text-center"
            >
              <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
                Ready to ship
              </p>
              <h2 class="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Put FormDesk on your site and start collecting messages today.
              </h2>
              <p class="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Nuxt 4 on the frontend, Nuxt UI v4 for the interface, Tailwind
                CSS v4 for styling, and Drizzle on Neon PostgreSQL for the data
                layer.
              </p>
              <div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:hello@formdesk.dev"
                  class="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Talk to sales
                </a>
                <a
                  href="#features"
                  class="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Review the stack
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="border-t border-white/10 bg-slate-950/80">
        <div
          class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3 text-slate-200">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-blue-600 text-xs font-bold text-white"
            >
              F
            </span>
            <span class="font-medium">FormDesk</span>
          </div>
          <p>&copy; {{ year }} FormDesk. Shared inbox infrastructure for web forms.</p>
        </div>
      </footer>
    </div>
  </UApp>
</template>
