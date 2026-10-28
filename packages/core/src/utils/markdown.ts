/**
 * A small Markdown subset for emails written in the dashboard: paragraphs,
 * line breaks, headings (#), lists (- or 1.), quotes (>), **bold**, *italic*,
 * `code` and links ([text](https://…) or bare URLs). Everything else is
 * escaped, so the output is safe to embed as HTML.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SAFE_URL = /^(?:https?:\/\/|mailto:)/i
const PLACEHOLDER = /\{\{[^{}]*\}\}/g

export interface MarkdownOptions {
  /**
   * Renders template variables such as {{name}}. Its result is escaped and
   * never parsed as Markdown, so variable values cannot add links or markup.
   * Without it, variables are kept as written.
   */
  variable?: (placeholder: string) => string
}

export function renderMarkdown(source: string, options: MarkdownOptions = {}): string {
  // Stashed fragments (code, links, variables) are swapped for \uE000<index>\uE000 markers.
  const stash: string[] = []
  const keep = (html: string) => `\uE000${stash.push(html) - 1}\uE000`
  const restore = (html: string): string =>
    html.replace(/\uE000(\d+)\uE000/g, (_, index: string) => restore(stash[Number(index)]!))

  const text = source
    .replace(/\uE000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(PLACEHOLDER, placeholder => keep(escapeHtml(options.variable ? options.variable(placeholder) : placeholder)))

  const inline = (value: string) => {
    let html = escapeHtml(value)
      .replace(/`([^`\n]+)`/g, (_, code: string) => keep(`<code>${code}</code>`))
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) =>
        SAFE_URL.test(url) ? keep(`<a href="${url}">${label}</a>`) : match)
      // Bare URLs stop at escaped quotes and brackets, and leave trailing punctuation out.
      .replace(/\bhttps?:\/\/(?:(?!&quot;|&#39;|&lt;|&gt;)[^\s\uE000])+/g, (match) => {
        const url = match.replace(/[.,;:!?)]+$/, '')
        return keep(`<a href="${url}">${url}</a>`) + match.slice(url.length)
      })
    html = html
      .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*(?=\S)(.+?)(?<=\S)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_(?=\S)(.+?)(?<=\S)_(?!\w)/g, '$1<em>$2</em>')
    return html
  }

  const blocks = text.split(/\n[ \t]*\n/).map(block => block.replace(/^\n+|\n+$/g, '')).filter(block => block.trim())

  const html = blocks.map((block) => {
    const lines = block.split('\n')

    const heading = lines.length === 1 && lines[0]!.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const level = heading[1]!.length + 1
      return `<h${level}>${inline(heading[2]!)}</h${level}>`
    }

    if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
      return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`
    }
    if (lines.every(line => /^\s*\d+[.)]\s+/.test(line))) {
      return `<ol>${lines.map(line => `<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`
    }
    if (lines.every(line => /^\s*>/.test(line))) {
      return `<blockquote>${lines.map(line => inline(line.replace(/^\s*>\s?/, ''))).join('<br>')}</blockquote>`
    }
    return `<p>${lines.map(inline).join('<br>')}</p>`
  }).join('\n')

  return restore(html)
}
