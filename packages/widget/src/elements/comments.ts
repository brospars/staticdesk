import type { CommentsWidgetConfig, PublicComment, PublicWidget } from '@staticdesk/core'

import { ApiError } from '../api'
import { h, uid } from '../dom'
import { renderMarkdown } from '../markdown'
import { readStore, writeStore } from '../storage'
import { renderTurnstile, type TurnstileHandle } from '../turnstile'
import { StaticDeskElement } from './base'

const styles = `
.sd-comments { display: grid; gap: 18px; }
.sd-title { margin: 0; font-size: 20px; line-height: 1.25; }
.sd-compose { display: grid; padding: 16px; border: 1px solid var(--sd-border); border-radius: var(--sd-radius); background: var(--sd-surface); }
.sd-compose .sd-button { justify-self: start; }
.sd-tabs { display: flex; gap: 4px; margin: 0 0 6px; }
.sd-tab { padding: 4px 10px; border: 0; border-radius: 6px; background: none; color: var(--sd-muted); cursor: pointer; font-size: 14px; }
.sd-tab[aria-selected="true"] { background: var(--sd-surface); color: var(--sd-fg); font-weight: 600; }
.sd-preview { min-height: 120px; padding: 10px 12px; border: 1px dashed var(--sd-border); border-radius: calc(var(--sd-radius) - 4px); }
.sd-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.sd-list, .sd-replies { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
.sd-replies { margin: 12px 0 0; padding-left: 18px; border-left: 2px solid var(--sd-border); }
.sd-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 14px; }
.sd-author { font-weight: 600; }
.sd-meta time, .sd-edited { color: var(--sd-muted); }
.sd-badge { padding: 1px 8px; border-radius: 999px; background: var(--sd-surface); color: var(--sd-muted); font-size: 12px; }
.sd-body { overflow-wrap: anywhere; }
.sd-body p, .sd-body ul, .sd-body blockquote, .sd-body pre { margin: 6px 0; }
.sd-body blockquote { padding-left: 12px; border-left: 3px solid var(--sd-border); color: var(--sd-muted); }
.sd-body pre { overflow: auto; padding: 10px; border-radius: 6px; background: var(--sd-surface); }
.sd-body code { font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.sd-body a { color: var(--sd-primary); }
.sd-deleted { color: var(--sd-muted); font-style: italic; }
.sd-actions { display: flex; gap: 4px; margin: 2px 0 0 -8px; }
.sd-link { padding: 4px 8px; border: 0; border-radius: 6px; background: none; color: var(--sd-muted); cursor: pointer; font-size: 14px; }
.sd-link:hover { background: var(--sd-surface); color: var(--sd-fg); }
.sd-notice { margin: 0; padding: 10px 12px; border-radius: calc(var(--sd-radius) - 4px); background: var(--sd-surface); }
.sd-empty { margin: 0; color: var(--sd-muted); }
.sd-status:empty { display: none; }
`

/** Tokens of the comments the visitor posted on this site: id → token. */
type Owned = Record<string, string>

const EDIT_WINDOW_MS = 15 * 60_000
const MAX_OWNED = 200

/**
 * Comments of the current page, with replies (two levels), anonymous posting,
 * Markdown and edition of one's own comments.
 * Optional `widget-id` selects a specific comments widget of the site.
 */
export class StaticDeskComments extends StaticDeskElement {
  private widget!: PublicWidget
  private pageId = ''
  private total = 0
  private nextOffset: number | null = null
  private heading!: HTMLElement
  private list!: HTMLOListElement
  private footer!: HTMLElement
  private turnstile: TurnstileHandle | null = null
  /** Comments posted from this page view that wait for approval. */
  private pending = new Set<string>()

  private get config() {
    return this.widget.config as Pick<CommentsWidgetConfig, 'title' | 'allowAnonymous' | 'sort'>
  }

  protected styles() {
    return styles
  }

  protected render() {
    const wanted = this.getAttribute('widget-id')
    const widget = this.site!.widgets.find(candidate =>
      candidate.kind === 'comments' && (!wanted || candidate.id === wanted))
    if (!widget) {
      console.warn('[StaticDesk] No enabled comments widget for this site.')
      return
    }
    this.widget = widget
    const titleId = uid('title')
    this.heading = h('h2', { class: 'sd-title', id: titleId })
    this.list = h('ol', { class: 'sd-list' })
    this.footer = h('div', {})
    this.root.append(h('section', { 'class': 'sd-card sd-comments', 'aria-labelledby': titleId },
      this.heading, this.composer(), this.list, this.footer))

    if (this.site!.turnstileSiteKey) {
      renderTurnstile(this, this.site!.turnstileSiteKey, this.locale).then((handle) => {
        this.turnstile = handle
      }, error => console.error('[StaticDesk] Could not load the anti-spam challenge.', error))
    }
    void this.load(0)
  }

  protected onPageChange() {
    if (this.widget && this.page().pageId !== this.pageId) void this.load(0)
  }

  private get owned(): Owned {
    return readStore<Owned>(`comments:${this.runtime!.config.siteKey}`) as Owned
  }

  private own(id: string, token: string) {
    const owned = Object.entries({ ...this.owned, [id]: token }).slice(-MAX_OWNED)
    writeStore(`comments:${this.runtime!.config.siteKey}`, Object.fromEntries(owned))
  }

  private updateHeading() {
    const title = this.config.title ?? this.t('comments.title')
    this.heading.textContent = this.total ? `${title} (${this.total})` : title
  }

  private async load(offset: number) {
    if (!offset) {
      this.pageId = this.page().pageId
      this.list.replaceChildren()
    }
    this.footer.replaceChildren()
    try {
      const result = await this.runtime!.api.comments({ pageId: this.pageId, widgetId: this.widget.id, offset })
      this.total = result.total
      this.nextOffset = result.nextOffset
      this.list.append(...result.comments.map(comment => this.item(comment)))
    }
    catch (error) {
      console.error('[StaticDesk] Could not load the comments.', error)
      const retry = h('button', { class: 'sd-button sd-button-ghost', type: 'button' }, this.t('comments.retry'))
      retry.addEventListener('click', () => this.load(offset))
      this.footer.append(h('p', { class: 'sd-status', role: 'alert' }, this.t('comments.loadError')), retry)
      return
    }
    this.updateHeading()
    if (!this.list.childElementCount) this.footer.append(h('p', { class: 'sd-empty' }, this.t('comments.empty')))
    if (this.nextOffset !== null) {
      const more = h('button', { class: 'sd-button sd-button-ghost', type: 'button' }, this.t('comments.more'))
      more.addEventListener('click', () => this.load(this.nextOffset!))
      this.footer.append(more)
    }
  }

  private item(comment: PublicComment): HTMLLIElement {
    const { t } = this
    const token = this.owned[comment.id]
    const date = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))
    const meta = h('div', { class: 'sd-meta' }, ...(comment.deleted
      ? []
      : [
          h('span', { class: 'sd-author' }, comment.author ?? t('comments.visitor', { id: comment.id.slice(0, 4) })),
          !comment.author && h('span', { class: 'sd-badge' }, t('comments.anonymous')),
          h('time', { datetime: comment.createdAt }, date),
          comment.editedAt && h('span', { class: 'sd-edited' }, `(${t('comments.edited')})`),
          this.pending.has(comment.id) && h('span', { class: 'sd-badge' }, t('comments.pending')),
        ]))
    const body = h('div', { class: 'sd-body' },
      comment.deleted ? h('p', { class: 'sd-deleted' }, t('comments.deleted')) : renderMarkdown(comment.body))
    const actions = h('div', { class: 'sd-actions' })
    const li = h('li', { 'data-id': comment.id }, h('article', {}, meta, body, actions))

    // Replies go to the top-level comment: two levels only.
    const threadId = comment.parentId ?? comment.id
    if (!this.pending.has(comment.id)) actions.append(this.action(t('comments.reply'), () => this.reply(threadId)))
    if (token && !comment.deleted) {
      if (Date.now() - Date.parse(comment.createdAt) < EDIT_WINDOW_MS) {
        actions.append(this.action(t('comments.edit'), () => this.editComment(li, comment, token)))
      }
      actions.append(this.action(t('comments.delete'), () => this.deleteComment(li, comment, token)))
    }

    if (!comment.parentId) {
      li.append(h('ol', { class: 'sd-replies', hidden: !comment.replies.length }, ...comment.replies.map(reply => this.item(reply))))
    }
    return li
  }

  private action(label: string, onClick: () => void) {
    const button = h('button', { class: 'sd-link', type: 'button' }, label)
    button.addEventListener('click', onClick)
    return button
  }

  private thread(id: string) {
    return this.list.querySelector<HTMLLIElement>(`:scope > li[data-id="${id}"]`)
  }

  /** Opens a reply form under a thread. */
  private reply(threadId: string) {
    const thread = this.thread(threadId)
    if (!thread) return
    const existing = thread.querySelector<HTMLFormElement>(':scope > form')
    if (existing) {
      existing.querySelector('textarea')!.focus()
      return
    }
    const form = this.composer(threadId)
    thread.append(form)
    form.querySelector<HTMLInputElement>('input[name="name"], textarea')!.focus()
  }

  /** Form to post a comment, or a reply to a thread. */
  private composer(parentId?: string): HTMLFormElement {
    const { t } = this
    const anonymous = this.config.allowAnonymous
    const textarea = h('textarea', { class: 'sd-input', name: 'body', required: true, maxlength: '5000' })
    const preview = h('div', { class: 'sd-preview sd-body', hidden: true })
    const tab = (label: string, selected: boolean) => h('button', { 'class': 'sd-tab', 'type': 'button', 'role': 'tab', 'aria-selected': String(selected) }, label)
    const write = tab(t('comments.write'), true)
    const show = tab(t('comments.preview'), false)
    const select = (showPreview: boolean) => {
      write.setAttribute('aria-selected', String(!showPreview))
      show.setAttribute('aria-selected', String(showPreview))
      textarea.hidden = showPreview
      preview.hidden = !showPreview
      preview.replaceChildren(textarea.value.trim() ? renderMarkdown(textarea.value) : h('p', { class: 'sd-empty' }, t('comments.nothing')))
    }
    write.addEventListener('click', () => select(false))
    show.addEventListener('click', () => select(true))

    const hintId = uid('hint')
    const status = h('p', { class: 'sd-status', role: 'alert' })
    const submitLabel = parentId ? t('comments.submitReply') : t('comments.submit')
    const submit = h('button', { class: 'sd-button', type: 'submit' }, submitLabel)
    const form = h('form', { class: 'sd-compose' },
      h('label', { class: 'sd-field' },
        h('span', { class: 'sd-label' }, t('comments.name'), anonymous && h('span', { class: 'sd-hint' }, ` (${t('contact.optional')})`)),
        h('input', { 'class': 'sd-input', 'name': 'name', 'autocomplete': 'nickname', 'maxlength': '120', 'required': !anonymous, 'aria-describedby': anonymous ? hintId : undefined }),
        anonymous && h('span', { class: 'sd-hint', id: hintId }, t('comments.anonymousHint'))),
      h('div', { class: 'sd-field' },
        h('span', { class: 'sd-label', id: `${hintId}-label` }, t('comments.body')),
        h('div', { 'class': 'sd-tabs', 'role': 'tablist', 'aria-labelledby': `${hintId}-label` }, write, show),
        textarea,
        preview,
        h('span', { class: 'sd-hint' }, t('comments.markdown'))),
      h('div', { 'class': 'sd-honeypot', 'aria-hidden': 'true' },
        h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' })),
      !parentId && h('slot', { name: 'turnstile' }),
      h('div', { class: 'sd-actions' }, submit, parentId && this.action(t('comments.cancel'), () => form.remove())),
      status,
    )
    textarea.setAttribute('aria-labelledby', `${hintId}-label`)
    const shownAt = Date.now()

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      select(false)
      if (!form.reportValidity()) return
      const data = new FormData(form)
      const value = (name: string) => String(data.get(name) ?? '').trim()
      submit.disabled = true
      submit.textContent = t('comments.posting')
      status.textContent = ''
      try {
        const posted = await this.runtime!.api.postComment({
          widgetId: this.widget.id,
          parentId,
          name: value('name') || undefined,
          body: value('body'),
          ...this.page(),
          website: value('website') || undefined,
          elapsedMs: Date.now() - shownAt,
          turnstileToken: this.turnstile?.token() ?? undefined,
        })
        if (posted.token) this.own(posted.comment.id, posted.token)
        this.added(posted.comment, posted.status, parentId)
        if (parentId) form.remove()
        else {
          textarea.value = ''
          if (posted.status === 'pending') status.replaceChildren(h('span', { class: 'sd-notice', role: 'status' }, t('comments.pendingNotice')))
        }
      }
      catch (error) {
        status.textContent = error instanceof ApiError
          ? (error.status === 429 ? t('error.rateLimited') : t('error.generic'))
          : t('error.network')
      }
      finally {
        this.turnstile?.reset()
        submit.disabled = false
        submit.textContent = submitLabel
      }
    })
    return form
  }

  /** Shows a comment the visitor just posted. */
  private added(comment: PublicComment, status: 'approved' | 'pending', parentId?: string) {
    if (status === 'pending') this.pending.add(comment.id)
    else this.total += 1
    this.updateHeading()
    this.footer.querySelector('.sd-empty')?.remove()
    const item = this.item(comment)
    const replies = parentId && this.thread(parentId)?.querySelector<HTMLOListElement>('.sd-replies')
    if (replies) {
      replies.hidden = false
      replies.append(item)
    }
    else if (this.config.sort === 'newest') this.list.prepend(item)
    else this.list.append(item)
    item.querySelector<HTMLElement>('.sd-link')?.focus()
  }

  private editComment(li: HTMLLIElement, comment: PublicComment, token: string) {
    const { t } = this
    const article = li.querySelector('article')!
    const textarea = h('textarea', { 'class': 'sd-input', 'name': 'body', 'required': true, 'maxlength': '5000', 'aria-label': t('comments.body') })
    textarea.value = comment.body
    const status = h('p', { class: 'sd-status', role: 'alert' })
    const submit = h('button', { class: 'sd-button', type: 'submit' }, t('comments.save'))
    const form = h('form', { class: 'sd-compose' }, textarea,
      h('div', { class: 'sd-actions' }, submit, this.action(t('comments.cancel'), () => {
        form.replaceWith(article)
        article.querySelector<HTMLElement>('.sd-link')?.focus()
      })),
      status)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (!form.reportValidity()) return
      submit.disabled = true
      try {
        const updated = await this.runtime!.api.editComment(comment.id, token, textarea.value.trim())
        if (updated.status === 'pending') this.pending.add(comment.id)
        const item = this.item({ ...updated.comment, replies: [] })
        form.replaceWith(item.querySelector('article')!)
      }
      catch (error) {
        status.textContent = error instanceof ApiError
          ? (error.status === 403 ? t('comments.editClosed') : t('error.generic'))
          : t('error.network')
        submit.disabled = false
      }
    })
    article.replaceWith(form)
    textarea.focus()
  }

  private async deleteComment(li: HTMLLIElement, comment: PublicComment, token: string) {
    if (!confirm(this.t('comments.confirmDelete'))) return
    try {
      await this.runtime!.api.deleteComment(comment.id, token)
    }
    catch (error) {
      console.error('[StaticDesk] Could not delete the comment.', error)
      alert(this.t('error.generic'))
      return
    }
    if (!this.pending.has(comment.id)) this.total -= 1
    this.updateHeading()
    const replies = li.querySelector('.sd-replies')
    if (replies?.childElementCount) {
      li.querySelector('article')!.replaceWith(this.item({ ...comment, deleted: true, replies: [] }).querySelector('article')!)
    }
    else li.remove()
  }
}
