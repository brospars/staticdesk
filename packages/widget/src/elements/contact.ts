import type { ContactField, ContactWidgetConfig, PublicWidget } from '@staticdesk/core'

import { ApiError } from '../api'
import { h, uid } from '../dom'
import { focusFirst, trapFocus } from '../focus-trap'
import { currentPage } from '../page'
import { renderTurnstile, type TurnstileHandle } from '../turnstile'
import { StaticDeskElement } from './base'

const styles = `
.sd-trigger {
  position: fixed; bottom: 20px; z-index: 2147483000; box-shadow: var(--sd-shadow); border-radius: 999px;
}
.sd-backdrop { position: fixed; inset: 0; z-index: 2147483001; background: rgb(15 23 42 / 0.35); }
.sd-panel {
  position: fixed; bottom: 84px; z-index: 2147483002; width: min(380px, calc(100vw - 24px));
  max-height: calc(100vh - 110px); overflow: auto; padding: 22px; border-radius: calc(var(--sd-radius) + 4px);
  background: var(--sd-bg); box-shadow: var(--sd-shadow); border: 1px solid var(--sd-border);
}
.sd-right { right: 20px; }
.sd-left { left: 20px; }
.sd-inline { padding: 22px; border: 1px solid var(--sd-border); border-radius: calc(var(--sd-radius) + 4px); background: var(--sd-bg); }
.sd-header { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.sd-title { margin: 0 0 6px; font-size: 20px; line-height: 1.25; }
.sd-description { margin: 0 0 18px; color: var(--sd-muted); }
.sd-close {
  width: 36px; height: 36px; flex: none; border: 0; border-radius: 999px; background: var(--sd-surface);
  font-size: 20px; line-height: 1; cursor: pointer;
}
.sd-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.sd-submit { width: 100%; }
.sd-check { display: flex; gap: 10px; align-items: start; margin: 0 0 14px; }
.sd-check input { width: 18px; height: 18px; margin: 2px 0 0; flex: none; accent-color: var(--sd-primary); }
.sd-success { text-align: center; padding: 8px 0; }
.sd-success p { color: var(--sd-muted); }
@media (max-width: 480px) {
  .sd-panel { left: 12px; right: 12px; bottom: 76px; width: auto; }
  .sd-trigger { bottom: 16px; }
  .sd-right.sd-trigger { right: 16px; }
  .sd-left.sd-trigger { left: 16px; }
}
`

/**
 * Contact form. `<staticdesk-contact mode="floating">` shows a floating button
 * that opens the form in a dialog; without it, the form renders inline.
 * Optional `widget-id` selects a specific contact widget of the site.
 */
export class StaticDeskContact extends StaticDeskElement {
  private widget: PublicWidget | null = null
  private trigger: HTMLButtonElement | null = null
  private dialog: HTMLElement | null = null
  private backdrop: HTMLElement | null = null
  private form!: HTMLFormElement
  private success!: HTMLElement
  private status!: HTMLElement
  private submit!: HTMLButtonElement
  private shownAt = 0
  private turnstile: TurnstileHandle | null = null

  get floating() {
    return this.getAttribute('mode') === 'floating'
  }

  protected styles() {
    return styles
  }

  protected render() {
    const wanted = this.getAttribute('widget-id')
    this.widget = this.site!.widgets.find(widget =>
      widget.kind === 'contact' && (!wanted || widget.id === wanted)) ?? null
    if (!this.widget) {
      console.warn('[StaticDesk] No enabled contact widget for this site.')
      return
    }
    const config = this.widget.config as ContactWidgetConfig
    const t = this.t
    const titleId = uid('title')

    const field = (label: string, control: HTMLElement, optional = false) =>
      h('label', { class: 'sd-field' },
        h('span', { class: 'sd-label' }, label, optional && h('span', { class: 'sd-hint' }, ` (${t('contact.optional')})`)),
        control)

    this.status = h('p', { 'class': 'sd-status', 'role': 'alert', 'aria-live': 'assertive' })
    this.submit = h('button', { class: 'sd-button sd-submit', type: 'submit' }, t('contact.submit'))
    const nameRequired = config.nameField === 'required'
    this.form = h('form', { novalidate: false },
      config.nameField !== 'hidden' && field(t('contact.name'),
        h('input', { class: 'sd-input', name: 'name', autocomplete: 'name', maxlength: '120', required: nameRequired }), !nameRequired),
      field(t('contact.email'), h('input', { class: 'sd-input', name: 'email', type: 'email', autocomplete: 'email', required: true, maxlength: '320' })),
      ...(config.fields ?? []).map(custom => this.customField(custom, field)),
      field(t('contact.message'), h('textarea', { class: 'sd-input', name: 'message', required: true, maxlength: '5000' })),
      // Honeypot: invisible to people and assistive technologies, filled by naive bots.
      h('div', { 'class': 'sd-honeypot', 'aria-hidden': 'true' },
        h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' })),
      h('slot', { name: 'turnstile' }),
      this.submit,
      this.status,
    )
    this.form.addEventListener('submit', event => this.onSubmit(event))

    this.success = h('div', { class: 'sd-success', hidden: true },
      h('p', { class: 'sd-title' }, t('contact.successTitle')),
      h('p', {}, config.successMessage ?? t('contact.success')),
      h('button', { class: 'sd-button sd-button-ghost', type: 'button' }, t('contact.again')),
    )
    this.success.querySelector('button')!.addEventListener('click', () => this.reset())

    const header = h('div', { class: 'sd-header' },
      h('h2', { class: 'sd-title', id: titleId }, config.title ?? t('contact.title')))
    const body = [header, h('p', { class: 'sd-description' }, config.description ?? t('contact.description')), this.form, this.success]

    if (this.site!.turnstileSiteKey) {
      renderTurnstile(this, this.site!.turnstileSiteKey, this.locale).then((handle) => {
        this.turnstile = handle
      }, error => console.error('[StaticDesk] Could not load the anti-spam challenge.', error))
    }

    if (!this.floating) {
      this.root.append(h('section', { 'class': 'sd-inline', 'aria-labelledby': titleId }, ...body))
      this.shownAt = Date.now()
      return
    }

    const side = config.position === 'bottom-left' ? 'sd-left' : 'sd-right'
    const dialogId = uid('dialog')
    const close = h('button', { 'class': 'sd-close', 'type': 'button', 'aria-label': t('close') }, '×')
    close.addEventListener('click', () => this.close())
    header.append(close)

    this.trigger = h('button', {
      'class': `sd-button sd-trigger ${side}`,
      'type': 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': dialogId,
    }, config.buttonLabel ?? t('contact.button'))
    this.trigger.addEventListener('click', () => this.open())

    this.backdrop = h('div', { class: 'sd-backdrop', hidden: true })
    this.backdrop.addEventListener('click', () => this.close())

    this.dialog = h('section', {
      'class': `sd-panel ${side}`,
      'id': dialogId,
      'role': 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      'hidden': true,
    }, ...body)
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.close()
      else trapFocus(event, this.dialog!, this.root)
    })

    this.root.append(this.trigger, this.backdrop, this.dialog)
  }

  /** Custom fields are named "field:<id>" so they never clash with the built-in inputs. */
  private customField(custom: ContactField, field: (label: string, control: HTMLElement, optional?: boolean) => HTMLElement) {
    const name = `field:${custom.id}`
    const required = custom.required
    if (custom.type === 'checkbox') {
      return h('label', { class: 'sd-check' },
        h('input', { type: 'checkbox', name, required }),
        h('span', {}, custom.label))
    }
    let control: HTMLElement
    if (custom.type === 'select') {
      control = h('select', { class: 'sd-input', name, required },
        h('option', { value: '' }, this.t('contact.choose')),
        ...custom.options.map(option => h('option', { value: option }, option)))
    }
    else {
      control = h(custom.type === 'textarea' ? 'textarea' : 'input', {
        class: 'sd-input',
        name,
        required,
        placeholder: custom.placeholder ?? undefined,
        maxlength: custom.type === 'textarea' ? '5000' : '500',
      })
    }
    return field(custom.label, control, !required)
  }

  /** Opens the floating form (no-op for inline forms). */
  open() {
    if (!this.dialog || !this.dialog.hidden) return
    this.dialog.hidden = false
    this.backdrop!.hidden = false
    this.trigger!.setAttribute('aria-expanded', 'true')
    this.shownAt = Date.now()
    focusFirst(this.form.hidden ? this.success : this.form)
    this.runtime!.api.track({ type: 'open', widgetId: this.widget!.id, ...currentPage() })
  }

  close() {
    if (!this.dialog || this.dialog.hidden) return
    this.dialog.hidden = true
    this.backdrop!.hidden = true
    this.trigger!.setAttribute('aria-expanded', 'false')
    this.trigger!.focus()
  }

  private reset() {
    this.form.reset()
    this.form.hidden = false
    this.success.hidden = true
    this.status.textContent = ''
    this.shownAt = Date.now()
    focusFirst(this.form)
  }

  private async onSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (!this.form.reportValidity()) return

    const data = new FormData(this.form)
    const value = (name: string) => String(data.get(name) ?? '').trim()

    this.submit.disabled = true
    this.submit.textContent = this.t('contact.sending')
    this.form.setAttribute('aria-busy', 'true')
    this.status.textContent = ''

    const config = this.widget!.config as ContactWidgetConfig
    const fields: Record<string, string | boolean> = {}
    for (const custom of config.fields ?? []) {
      const raw = data.get(`field:${custom.id}`)
      if (custom.type === 'checkbox') fields[custom.id] = raw !== null
      else if (raw !== null && String(raw).trim()) fields[custom.id] = String(raw).trim()
    }

    try {
      await this.runtime!.api.submitContact({
        name: value('name') || undefined,
        email: value('email'),
        message: value('message'),
        fields,
        widgetId: this.widget!.id,
        ...currentPage(),
        website: value('website') || undefined,
        elapsedMs: Date.now() - this.shownAt,
        turnstileToken: this.turnstile?.token() ?? undefined,
      })
      if (config.redirectUrl) {
        location.assign(config.redirectUrl)
        return
      }
      this.form.hidden = true
      this.success.hidden = false
      this.success.querySelector('button')!.focus()
    }
    catch (error) {
      this.status.textContent = error instanceof ApiError
        ? (error.status === 429 ? this.t('error.rateLimited') : config.errorMessage ?? this.t('error.generic'))
        : this.t('error.network')
    }
    finally {
      this.turnstile?.reset()
      this.submit.disabled = false
      this.submit.textContent = this.t('contact.submit')
      this.form.removeAttribute('aria-busy')
    }
  }
}
