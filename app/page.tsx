export default function Home() {
  return (
    <>
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              F
            </span>
            FormDesk
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="hidden sm:inline-flex text-sm text-muted hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-hover transition-colors"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden hero-grid">
        {/* Decorative orbs */}
        <div className="gradient-orb w-[500px] h-[500px] bg-primary-muted -top-48 -right-32 absolute" />
        <div className="gradient-orb w-[400px] h-[400px] bg-accent -bottom-32 -left-24 absolute opacity-20" />

        <div className="relative mx-auto max-w-3xl px-6 pt-28 pb-24 text-center">
          <div className="animate-fade-up">
            <span className="pill bg-primary-light text-primary border border-primary/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Now in beta
            </span>
          </div>

          <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-up animate-delay-1">
            The simplest way to hear
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              from your customers
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted leading-relaxed animate-fade-up animate-delay-2">
            Add an embeddable contact form to any website in&nbsp;minutes.
            Every message lands in a shared team&nbsp;inbox — so nothing
            slips&nbsp;through&nbsp;the&nbsp;cracks.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animate-delay-3">
            <a
              href="#"
              className="inline-flex h-12 items-center rounded-xl bg-primary px-7 text-base font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/25 transition-all"
            >
              Get Started Free
              <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-xl border border-border px-7 text-base font-medium text-muted hover:text-foreground hover:border-foreground/20 transition-all"
            >
              See how it works
            </a>
          </div>

          {/* Mini form preview */}
          <div className="mx-auto mt-16 max-w-md animate-fade-up animate-delay-4">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-primary/5">
              <div className="space-y-3">
                <div className="h-9 rounded-lg bg-surface-elevated border border-border" />
                <div className="h-9 rounded-lg bg-surface-elevated border border-border" />
                <div className="h-20 rounded-lg bg-surface-elevated border border-border" />
                <div className="flex justify-end">
                  <div className="h-9 w-24 rounded-lg bg-primary/80" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted text-center">
                Your form, embedded on your site
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 text-center text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need, nothing&nbsp;you&nbsp;don&rsquo;t
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="card-hover rounded-2xl border border-border bg-background p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold">Drop-in form widget</h3>
              <p className="mt-2 text-muted leading-relaxed">
                Paste a single script tag. A polished contact form appears on your site
                — fully styled, responsive,&nbsp;ready&nbsp;to&nbsp;go.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover rounded-2xl border border-border bg-background p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold">Shared team inbox</h3>
              <p className="mt-2 text-muted leading-relaxed">
                Every submission flows into one inbox your whole team can see.
                Assign, reply, resolve — together,&nbsp;in&nbsp;real&nbsp;time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover rounded-2xl border border-border bg-background p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold">No per-seat pricing</h3>
              <p className="mt-2 text-muted leading-relaxed">
                Invite your entire team — no surprise bills. One flat price
                covers unlimited&nbsp;seats,&nbsp;period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl sm:text-4xl font-bold tracking-tight">
            Up and running in&nbsp;minutes
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
            {/* Step 1 */}
            <div className="relative text-center md:text-left step-connector">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-xl font-bold shadow-lg shadow-primary/20">
                1
              </div>
              <h3 className="mt-5 text-lg font-semibold">Add the widget</h3>
              <p className="mt-2 text-muted leading-relaxed">
                Copy a snippet, paste it into your HTML. The form appears
                instantly&nbsp;— no&nbsp;build&nbsp;step.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center md:text-left step-connector">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-xl font-bold shadow-lg shadow-primary/20">
                2
              </div>
              <h3 className="mt-5 text-lg font-semibold">Messages arrive</h3>
              <p className="mt-2 text-muted leading-relaxed">
                When a visitor submits the form, it shows up in your
                FormDesk&nbsp;inbox immediately.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center md:text-left">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-xl font-bold shadow-lg shadow-primary/20">
                3
              </div>
              <h3 className="mt-5 text-lg font-semibold">Reply as a team</h3>
              <p className="mt-2 text-muted leading-relaxed">
                Assign conversations, leave internal notes, and respond
                directly — all from&nbsp;one&nbsp;place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-center text-3xl sm:text-4xl font-bold tracking-tight">
            Start free, upgrade&nbsp;when&nbsp;you&rsquo;re&nbsp;ready
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted">
            No credit card required. No per-seat fees.&nbsp;Ever.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {/* Free tier */}
            <div className="rounded-2xl border border-border bg-background p-8 flex flex-col">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">
                Free
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted">/mo</span>
              </div>
              <p className="mt-4 text-muted leading-relaxed">
                Perfect for side-projects and personal&nbsp;sites.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <PricingItem>50 submissions / month</PricingItem>
                <PricingItem>1 form widget</PricingItem>
                <PricingItem>Shared inbox</PricingItem>
                <PricingItem>Unlimited team members</PricingItem>
              </ul>
              <a
                href="#"
                className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl border border-border font-medium hover:border-foreground/20 hover:text-foreground transition-all text-muted"
              >
                Get Started
              </a>
            </div>

            {/* Pro tier */}
            <div className="relative rounded-2xl border-2 border-primary bg-background p-8 flex flex-col shadow-lg shadow-primary/5">
              <div className="absolute -top-3 right-6">
                <span className="pill bg-primary text-white text-xs font-semibold shadow-md">
                  Most popular
                </span>
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Pro
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-muted">/mo</span>
              </div>
              <p className="mt-4 text-muted leading-relaxed">
                For growing teams that need&nbsp;more.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <PricingItem>Unlimited submissions</PricingItem>
                <PricingItem>Unlimited form widgets</PricingItem>
                <PricingItem>Shared inbox</PricingItem>
                <PricingItem>Unlimited team members</PricingItem>
                <PricingItem>Priority support</PricingItem>
              </ul>
              <a
                href="#"
                className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary font-medium text-white shadow-sm hover:bg-primary-hover transition-colors"
              >
                Start Pro Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to simplify customer&nbsp;feedback?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted">
            Set up your form in under five minutes.
            Free&nbsp;forever — no&nbsp;credit&nbsp;card.
          </p>
          <a
            href="#"
            className="mt-8 inline-flex h-12 items-center rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/25 transition-all"
          >
            Get Started Free
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white text-[10px] font-bold">
              F
            </span>
            FormDesk
          </div>
          <p className="text-sm text-muted">
            &copy;&nbsp;{new Date().getFullYear()} FormDesk. All&nbsp;rights&nbsp;reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

function PricingItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg
        className="h-4 w-4 shrink-0 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}
