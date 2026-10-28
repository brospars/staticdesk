import type { ReactionKind, ReactionsWidgetConfig } from '@staticdesk/core'

import { ApiError } from '../api'
import { h, uid } from '../dom'
import { readStore, writeStore } from '../storage'
import { StaticDeskElement } from './base'

const styles = `
.sd-reactions { display: grid; gap: 14px; }
.sd-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.sd-question { margin: 0; font-weight: 600; }
.sd-chip {
  display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px;
  border: 1px solid var(--sd-border); border-radius: 999px; background: var(--sd-bg); cursor: pointer;
}
.sd-chip[aria-pressed="true"] { border-color: var(--sd-primary); box-shadow: inset 0 0 0 1px var(--sd-primary); background: var(--sd-surface); }
.sd-chip:disabled { cursor: progress; opacity: 0.7; }
.sd-count { font-variant-numeric: tabular-nums; color: var(--sd-muted); font-size: 14px; }
.sd-thanks { margin: 0; color: var(--sd-muted); }
.sd-feedback textarea.sd-input { min-height: 80px; }
.sd-status:empty { display: none; }
`

/** Reactions the visitor posted on a page: kind → id and token. */
type Mine = Partial<Record<ReactionKind, { id: string, token: string }>>

/**
 * "Was this page helpful?" and emoji reactions for the current page.
 * Optional `widget-id` selects a specific reactions widget of the site.
 */
export class StaticDeskReactions extends StaticDeskElement {
  private config!: ReactionsWidgetConfig
  private widgetId!: string
  private pageId = ''
  private mine: Mine = {}
  private counts: Record<string, number> = {}
  private section!: HTMLElement
  private busy = false

  protected styles() {
    return styles
  }

  protected render() {
    const wanted = this.getAttribute('widget-id')
    const widget = this.site!.widgets.find(candidate =>
      candidate.kind === 'reactions' && (!wanted || candidate.id === wanted))
    if (!widget) {
      console.warn('[StaticDesk] No enabled reactions widget for this site.')
      return
    }
    this.widgetId = widget.id
    this.config = widget.config as ReactionsWidgetConfig
    this.section = h('section', { class: 'sd-card sd-reactions' })
    this.root.append(this.section)
    void this.load()
  }

  protected onPageChange() {
    if (this.config && this.page().pageId !== this.pageId) void this.load()
  }

  private get storeKey() {
    return `reactions:${this.runtime!.config.siteKey}:${this.pageId}`
  }

  private async load() {
    this.pageId = this.page().pageId
    this.mine = readStore<Mine>(this.storeKey)
    this.counts = {}
    this.draw()
    if (!this.config.emojis.length) return
    try {
      this.counts = (await this.runtime!.api.reactions(this.pageId)).counts
      this.draw()
    }
    catch (error) {
      console.error('[StaticDesk] Could not load the reactions.', error)
    }
  }

  private draw(notice?: HTMLElement) {
    const { config, t } = this
    const children: HTMLElement[] = []

    if (config.helpful) {
      const questionId = uid('question')
      const vote = this.mine.helpful ? 'helpful' : this.mine.unhelpful ? 'unhelpful' : null
      const button = (kind: 'helpful' | 'unhelpful', icon: string, label: string) => {
        const element = h('button', { 'class': 'sd-chip', 'type': 'button', 'aria-pressed': String(vote === kind), 'disabled': this.busy },
          h('span', { 'aria-hidden': 'true' }, icon), label)
        element.addEventListener('click', () => this.toggle(kind))
        return element
      }
      children.push(h('div', { 'class': 'sd-row', 'role': 'group', 'aria-labelledby': questionId },
        h('p', { class: 'sd-question', id: questionId }, config.title ?? t('reactions.helpful')),
        button('helpful', '👍', t('reactions.yes')),
        button('unhelpful', '👎', t('reactions.no'))))
      if (notice) children.push(notice)
      else if (vote) children.push(h('p', { class: 'sd-thanks', role: 'status' }, t('reactions.thanks')))
    }

    if (config.emojis.length) {
      children.push(h('div', { 'class': 'sd-row', 'role': 'group', 'aria-label': t('reactions.label') },
        ...config.emojis.map((emoji) => {
          const kind: ReactionKind = `emoji:${emoji}`
          const count = this.counts[kind] ?? 0
          const element = h('button', {
            'class': 'sd-chip',
            'type': 'button',
            'aria-pressed': String(Boolean(this.mine[kind])),
            'aria-label': t('reactions.emoji', { emoji, count }),
            'disabled': this.busy,
          }, h('span', { 'aria-hidden': 'true' }, emoji), h('span', { 'class': 'sd-count', 'aria-hidden': 'true' }, String(count)))
          element.addEventListener('click', () => this.toggle(kind))
          return element
        })))
    }

    // Keep the focus on the button that was clicked.
    const focused = this.root.activeElement
    const index = focused ? [...this.section.querySelectorAll('button')].indexOf(focused as HTMLButtonElement) : -1
    this.section.replaceChildren(...children)
    if (index >= 0) this.section.querySelectorAll('button')[index]?.focus()
  }

  private save() {
    writeStore(this.storeKey, this.mine)
  }

  private async toggle(kind: ReactionKind) {
    if (this.busy) return
    this.busy = true
    const api = this.runtime!.api
    const page = this.page()
    let notice: HTMLElement | undefined
    try {
      const previous = this.mine[kind]
      if (previous) {
        this.mine[kind] = undefined
        this.counts = (await api.unreact(previous.id, previous.token)).counts
      }
      else {
        // One vote: "yes" replaces "no" and the other way round.
        const opposite = kind === 'helpful' ? 'unhelpful' : kind === 'unhelpful' ? 'helpful' : null
        const replaced = opposite && this.mine[opposite]
        if (replaced) {
          this.mine[opposite] = undefined
          await api.unreact(replaced.id, replaced.token).catch(() => {})
        }
        const { id, token, counts } = await api.react({ kind, widgetId: this.widgetId, ...page })
        this.mine[kind] = { id, token }
        this.counts = counts
        if (kind === 'unhelpful' && this.config.askComment) notice = this.feedbackForm(id, token)
      }
      this.save()
    }
    catch (error) {
      // Gone on the server (e.g. removed by a moderator): forget it.
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        this.mine[kind] = undefined
        this.save()
      }
      notice = h('p', { class: 'sd-status', role: 'alert' },
        error instanceof ApiError ? (error.status === 429 ? this.t('error.rateLimited') : this.t('error.generic')) : this.t('error.network'))
    }
    this.busy = false
    this.draw(notice)
    if (notice?.localName === 'form') notice.querySelector('textarea')!.focus()
  }

  /** Asks what could be improved after a "no". */
  private feedbackForm(id: string, token: string) {
    const t = this.t
    const textarea = h('textarea', { class: 'sd-input', name: 'comment', maxlength: '2000', required: true })
    const status = h('p', { class: 'sd-status', role: 'alert' })
    const submit = h('button', { class: 'sd-button', type: 'submit' }, t('reactions.send'))
    const form = h('form', { class: 'sd-feedback' },
      h('p', { class: 'sd-thanks', role: 'status' }, t('reactions.thanks')),
      h('label', { class: 'sd-field' }, h('span', { class: 'sd-label' }, t('reactions.improve')), textarea),
      submit,
      status)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const comment = textarea.value.trim()
      if (!comment) return
      submit.disabled = true
      try {
        await this.runtime!.api.commentReaction(id, token, comment)
        form.replaceWith(h('p', { class: 'sd-thanks', role: 'status' }, t('reactions.sent')))
      }
      catch (error) {
        status.textContent = error instanceof ApiError ? t('error.generic') : t('error.network')
        submit.disabled = false
      }
    })
    return form
  }
}
